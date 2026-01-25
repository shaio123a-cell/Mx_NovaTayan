import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'shared-xform': path.resolve(__dirname, '../../packages/shared-xform'),
            'shared-xform/xform_engine': path.resolve(__dirname, '../../packages/shared-xform/xform_engine.ts'),
            'shared-xform/xform_validation': path.resolve(__dirname, '../../packages/shared-xform/xform_validation.ts'),
            'shared-xform/xform_renderers': path.resolve(__dirname, '../../packages/shared-xform/xform_renderers.ts'),
            'shared-xform/xform_selectors_html': path.resolve(__dirname, '../../packages/shared-xform/xform_selectors_html.ts'),
            'shared-xform/xform_selectors_json': path.resolve(__dirname, '../../packages/shared-xform/xform_selectors_json.ts'),
            'shared-xform/xform_selectors_xml': path.resolve(__dirname, '../../packages/shared-xform/xform_selectors_xml.ts'),
            'shared-xform/xform_vars': path.resolve(__dirname, '../../packages/shared-xform/xform_vars.ts'),
            'shared-xform/xform_schema': path.resolve(__dirname, '../../packages/shared-xform/xform_schema.ts')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
