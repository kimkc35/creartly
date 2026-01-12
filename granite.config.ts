import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'creartly',
  brand: {
    displayName: 'Cre:Artly', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#CFB59E', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: '', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
    bridgeColorMode: 'inverted',  // 다운그레이드 후 추가 필요('basic' | 'inverted')
  },
  web: {
    host: '192.168.45.253',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
