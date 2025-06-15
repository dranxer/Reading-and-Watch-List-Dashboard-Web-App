/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (oneOfRule.use && oneOfRule.use.loader === 'postcss-loader') {
            oneOfRule.use.options = {
              ...oneOfRule.use.options,
              postcssOptions: {
                plugins: [],
              },
            };
          }
        });
      }
    });
    return config;
  },
}

module.exports = nextConfig 