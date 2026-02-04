import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

// Ensure 32 byte key. In prod use proper key management.
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || '12345678901234567890123456789012').substring(0, 32); 
const IV_LENGTH = 16;

@Injectable()
export class GlobalVarsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const vars = await this.prisma.globalVariable.findMany({
        orderBy: { name: 'asc' }
    });
    return vars.map(v => this.maskSecret(v));
  }
  
  // Returns map of Name -> Value (Decrypted)
  async findAllResolved() {
      const vars = await this.prisma.globalVariable.findMany();
      const map: Record<string, any> = {};
      for (const v of vars) {
          if (v.type === 'secret' && v.isSecret) {
              map[v.name] = this.decrypt(v.value);
          } else {
              map[v.name] = v.value;
          }
      }
      return map;
  }

  async findOne(id: string) {
    const v = await this.prisma.globalVariable.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Global variable not found');
    return this.maskSecret(v);
  }

  async create(data: Prisma.GlobalVariableCreateInput, user: string) {
    const input: Prisma.GlobalVariableCreateInput = { ...data };
    
    if (input.type === 'secret') {
        input.value = this.encrypt(input.value);
        input.isSecret = true;
    } else {
        input.isSecret = false;
    }

    try {
        const result = await this.prisma.globalVariable.create({ data: input });
        await this.auditLog('CREATE', 'GLOBAL_VAR', result.id, user, { after: this.maskSecret(result) });
        return this.maskSecret(result);
    } catch (e: any) {
        if (e.code === 'P2002') throw new ConflictException('Variable name already exists');
        throw e;
    }
  }

  async update(id: string, data: Partial<Prisma.GlobalVariableCreateInput> & { version?: number }, user: string) {
    const current = await this.prisma.globalVariable.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Global variable not found');

    if (data.version !== undefined && current.version !== data.version) {
        throw new ConflictException(`Version conflict: expected ${current.version}, got ${data.version}`);
    }

    const updates: any = { ...data };
    delete updates.version; // We will increment manually
    

    // Handle secret update
    // If sent value is '***', we assume no change to secret value
    if (updates.type === 'secret') {
        if (updates.value && updates.value !== '***') {
             updates.value = this.encrypt(updates.value);
             updates.isSecret = true;
        } else {
            // If explicit '***' or missing, keep existing value
            // But if changing FROM non-secret TO secret with '***', that's invalid if we don't have value.
            // Assuming UI sends new value if changing type.
            if (updates.value === '***') {
                delete updates.value;
            }
        }
    } else if (updates.type && updates.type !== 'secret') {
         updates.isSecret = false;
         // Value is plain text
    }

    updates.version = current.version + 1;

    const result = await this.prisma.globalVariable.update({
        where: { id },
        data: updates
    });
    
    await this.auditLog('UPDATE', 'GLOBAL_VAR', id, user, { before: this.maskSecret(current), after: this.maskSecret(result) });
    return this.maskSecret(result);
  }

  async delete(id: string, user: string) {
     const current = await this.prisma.globalVariable.findUnique({ where: { id } });
     if (!current) throw new NotFoundException('Global variable not found');

     await this.prisma.globalVariable.delete({ where: { id } });
     await this.auditLog('DELETE', 'GLOBAL_VAR', id, user, { before: this.maskSecret(current) });
  }

  async getGroups() {
      // Distinct groups from variables
      const usedGroups = await this.prisma.globalVariable.findMany({ select: { group: true }, distinct: ['group'] });
      // Distinct groups from explicit table
      const definedGroups = await this.prisma.globalVariableGroup.findMany({ orderBy: { name: 'asc' } });
      
      const set = new Set(definedGroups.map(g => g.name));
      usedGroups.forEach(i => { if(i.group) set.add(i.group); });
      
      return Array.from(set).sort().map(name => ({
          name,
          isDefined: definedGroups.some(g => g.name === name),
          id: definedGroups.find(g => g.name === name)?.id
      }));
  }

  async createGroup(name: string, description: string) {
      try {
          return await this.prisma.globalVariableGroup.create({
              data: { name, description }
          });
      } catch (e: any) {
          if (e.code === 'P2002') throw new ConflictException('Group already exists');
          throw e;
      }
  }

  async updateGroup(oldName: string, data: { name: string, description?: string }) {
      // 1. Check if new name exists
      if (oldName !== data.name) {
          const exists = await this.prisma.globalVariableGroup.findUnique({ where: { name: data.name } });
          if (exists) throw new ConflictException('New group name already exists');
      }

      return await this.prisma.$transaction(async (tx) => {
          // 2. Update variables first (works for both implicit and defined)
          if (oldName !== data.name) {
              await tx.globalVariable.updateMany({
                  where: { group: oldName },
                  data: { group: data.name }
              });
          }

          // 3. Update or create the group record
          const existingRecord = await tx.globalVariableGroup.findUnique({ where: { name: oldName } });
          if (existingRecord) {
              return await tx.globalVariableGroup.update({
                  where: { name: oldName },
                  data: { name: data.name, description: data.description }
              });
          } else {
              // Creating record for previously implicit group
              return await tx.globalVariableGroup.create({
                  data: { name: data.name, description: data.description || '' }
              });
          }
      });
  }

  async deleteGroup(name: string) {
      // Check if used?
      const count = await this.prisma.globalVariable.count({ where: { group: name } });
      if (count > 0) throw new ConflictException('Cannot delete group that contains variables');
      
      try {
        await this.prisma.globalVariableGroup.delete({ where: { name } }); 
      } catch (e) {
          // Ignore if not found in table (might be implicit group)
      }
  }

  // --- Encryption Helpers ---
  private encrypt(text: string): string {
     if (!text) return text;
     const iv = crypto.randomBytes(IV_LENGTH);
     const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
     let encrypted = cipher.update(text);
     encrypted = Buffer.concat([encrypted, cipher.final()]);
     return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  // Decrypt needed for resolving variables at runtime
  decrypt(text: string): string { 
     try {
       if (!text.includes(':')) return text;
       const textParts = text.split(':');
       const iv = Buffer.from(textParts.shift()!, 'hex');
       const encryptedText = Buffer.from(textParts.join(':'), 'hex');
       const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
       let decrypted = decipher.update(encryptedText);
       decrypted = Buffer.concat([decrypted, decipher.final()]);
       return decrypted.toString();
     } catch (e) {
         // Fallback if not encrypted or error
         return text; 
     }
  }

  private maskSecret(v: any) {
      if (v.isSecret || v.type === 'secret') {
          return { ...v, value: '***' };
      }
      return v;
  }

  private async auditLog(action: string, entity: string, entityId: string, actor: string, details: any) {
      await this.prisma.auditLog.create({
          data: {
              action,
              entity,
              entityId,
              actor,
              details: details ?? {}
          }
      });
  }
}
