import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'creartly',
  brand: {
    displayName: '크리아틀리', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#CFB59E', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: 'https://firebasestorage.googleapis.com/v0/b/creartly-326fe.firebasestorage.app/o/source%2Ficon.png?alt=media&token=ebcdf02c-734d-4542-96cc-24a5e039ea6f', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    host: '192.168.45.253',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [
    {
      name: 'photos',
      access: 'read',
    }
  ],
  outdir: 'dist',
});
