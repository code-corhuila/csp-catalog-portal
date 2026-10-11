const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'catalog',
  exposes: {
    './routes': './src/app/catalog/catalog.routes.ts',
    // Administration slice (billboard, movies, rooms) loaded by the shell at
    // /admin/* through ADMIN_ROUTES. Declared apart from './routes' so every
    // other /admin address keeps falling through to the shell's 404 page.
    './admin-routes': './src/app/catalog/admin/admin.routes.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
  // Entry points the application never loads: sharing them would bundle their
  // dependencies (@angular/animations is not even installed).
  skip: [
    'rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket',
    '@angular/platform-browser/animations', '@angular/platform-browser/animations/async',
  ],
});
