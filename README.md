# netlify-okta-auth

This package allows you to use [Okta](https://www.okta.com/) as your identity provider for use with Netlify's [Role-based access control with JWT](https://docs.netlify.com/visitor-access/role-based-access-control/).

## Who is this for?

You have a static website, hosted on [Netlify](https://www.netlify.com/) that doesn't have an identity backend, and you want to use Okta as the identity provider to gate access to all (or some) of the static resources hosted on the Netlify site.

### Other options

If Okta or Netlify aren't requirements for you, then this is probably not the package for you. This package was built for the (admittedly narrow) use case for using specifically Netlify and Okta together.

## What does this do?

This package handles marshalling the different types of [JWT](https://jwt.io) tokens that are used by Netlify and Okta. Netlify uses one flavor, and Okta another. You can learn more in [our architecture doc](./docs/architecture.md).

When properly installed, you can require an end-user to authenticate using your Okta identity provider before they can access any of your content.

## What value should I expect from this?

1. **Reduced complexity.** You don't need to maintain your own Netlify functions to integrate with Okta.
1. **Helpful docs.** This tool was originally built for an internal docs site by folks who love great technical docs.
1. **Netlify preview site support.** In addition to the primary site, this package provides security for Netlify's preview deployment sites.
1. **Production tested.** This package is used actively at [Twilio](https://www.twilio.com) for protecting internal documentation sites.

## Installation and getting started

[Read our installation guide »](./docs/installation.md)

## Documentation

- [Installation Guide](./docs/installation.md)
- [Production Configuration](docs/production.md)
- [Architecture Overview](./docs/architecture.md)
- [Configuration Reference](./docs/reference.md)

## Code of conduct

Before contributing issues, pull requests, comments, etc., please refer to our [code of conduct](CODE_OF_CODUCT.md).

## Contributing

Contributions are welcome. Be sure to read our [code of conduct](CODE_OF_CODUCT.md) before opening a pull request.

## License

[MIT](LICENSE)
Copyright 2022 Twilio Inc.
