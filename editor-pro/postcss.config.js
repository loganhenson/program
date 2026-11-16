module.exports = {
  plugins: [
    // Tailwind 4 resolves @import itself. Vendor prefixes and the flattening
    // of nested rules are done by Lightning CSS, which the plugin only runs
    // for NODE_ENV=production unless `optimize` is set; it takes over from
    // autoprefixer, so run it for every build (un-minified, as before).
    require('@tailwindcss/postcss')({ optimize: { minify: false } }),
  ]
}
