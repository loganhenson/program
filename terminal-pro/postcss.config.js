module.exports = {
  plugins: [
    // Tailwind 4 resolves @import and adds vendor prefixes itself
    // `optimize` runs Lightning CSS (vendor prefixes, flattened nesting),
    // which is otherwise only done when NODE_ENV=production
    require('@tailwindcss/postcss')({ optimize: { minify: false } }),
  ]
}
