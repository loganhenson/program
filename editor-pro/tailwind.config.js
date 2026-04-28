module.exports = {
  content: [
    './src/**/*.elm',
    '../editor/src/**/*.elm',
    '../terminal/src/**/*.elm',
    './js/**/*.js',
    './built/index.html',
  ],
  theme: {
    extend: {
      colors: {
        white: '#d4d4d4',
        lightgray_transparent: '#8f99ab42',
        lightgray: '#474a50',
        lightergray: '#6d6d70',
      }
    }
  },
  plugins: []
}
