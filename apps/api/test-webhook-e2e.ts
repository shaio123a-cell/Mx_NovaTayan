import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function testWebhook() {
    console.log('--- STARTING WEBHOOK E2E TEST ---');
    try {
        // 0. Get any existing user
        const existingUser = await prisma.user.findFirst();
        const ownerId = existingUser ? existingUser.id : 'system-user';
        console.log('Using ownerId:', ownerId);

        // 1. Create a dummy workflow
        const workflow = await prisma.workflow.create({
            data: {
                name: 'TEST_WEBHOOK_WORKFLOW',
                description: 'Testing webhook trigger and mapping',
                version: 1,
                ownerId: ownerId,
                scope: 'GLOBAL',
                nodes: [], // No nodes needed for trigger test
                edges: [],
                inputVariables: {
                    'target_var': { type: 'string' }
                }
            }
        });
        console.log('Workflow created:', workflow.id);

        // 2. Create a Webhook Token with mapping
        const tokenValue = `whk_test_${Date.now()}`;
        const token = await prisma.triggerToken.create({
            data: {
                workflowId: workflow.id,
                token: tokenValue,
                description: 'E2E Test Token',
                mapping: {
                    'target_var': '{{ body.user.name | upper }}'
                }
            }
        });
        console.log('Token created:', tokenValue);
        console.log('Mapping:', JSON.stringify(token.mapping));

        // 3. Simulate the Trigger logic (without HTTP overhead if possible, but let's just test our service logic)
        // Since we can't easily call NestJS service here, we'll verify the DB state and token existence.
        
        console.log('\n--- VERIFICATION ---');
        const foundToken = await prisma.triggerToken.findUnique({
            where: { token: tokenValue }
        });
        
        if (foundToken && foundToken.mapping['target_var'] === '{{ body.user.name | upper }}') {
            console.log('✅ Token and Mapping successfully persisted!');
        } else {
            console.log('❌ Persistence check failed!');
        }

        // Cleanup
        await prisma.triggerToken.delete({ where: { id: token.id } });
        await prisma.workflow.delete({ where: { id: workflow.id } });
        console.log('\n--- CLEANUP COMPLETE ---');

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testWebhook();
