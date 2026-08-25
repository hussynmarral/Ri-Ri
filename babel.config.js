module.exports = function (api) {
  // cache.using lets us vary config per platform without disabling caching
  const platform = api.caller((caller) => (caller && caller.platform) || 'unknown');
  api.cache.using(() => platform);

  const isWeb = platform === 'web';

  return {
    presets: ['babel-preset-expo'],
    // worklets/reanimated plugin is native-only — web has its own reanimated impl
    plugins: isWeb ? [] : ['react-native-reanimated/plugin'],
  };
};
