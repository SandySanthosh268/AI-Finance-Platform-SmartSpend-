// next.config.mjs
export default {
  experimental: {
    turbo: false, // ✅ Disable Turbopack to fix internal font module error
  },
};
