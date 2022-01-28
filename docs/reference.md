# netlify-okta-auth Configuration Reference

## Configuration object

In your `auth.js` and `login.js` Netlify function code, you call the `getAuthHandler` and `getLoginHandler` functions, respectively, and pass it a configuration object. Below are all the possible configuration keys you can provide in this object.

| key           | type       | description                                                                                          |
| ------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `jwtSecret`   | **string** | The secret used to sign the JWT token for Netlify.                                                   |
| `prodBaseUrl` | **string** | The base URL of your site.                                                                           |
| `oktaUrl`     | **string** | The "App Embed Link" for your Okta app. [See docs](./installation.md#okta-for-local-dev-setup).      |
| `siteTitle`   | **string** | A title to show on the interstitial redirect pages (default is just "Login").                        |
| `unsafe`      | **object** | Flags you can set when debugging locally. **Not intended for production.** See available keys below. |

[See type reference here](https://github.com/twilio-labs/netlify-okta-auth/blob/main/src/utils.ts#L13).

### `unsafe` config options

| key                     | type        | description                                                                                                                                        |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`                 | **boolean** | Enable debug mode. Doesn't automatically redirect and displays more diagnostic info.                                                               |
| `ignoreTokenExpiration` | **boolean** | Will allow an expired token. Helpful when troubleshooting without needing to re-authenticate.                                                      |
| `insecureCookies`       | **boolean** | Doesn't mark cookies as `Secure`. Useful if you are troubleshooting a local site over http (without TLS) and a domain name other than `localhost`. |

[See type reference here](https://github.com/twilio-labs/netlify-okta-auth/blob/main/src/utils.ts#L7)

## Environment variables

The following environment variables can be set. Values set by environment variables override any settings you may set using the configuration object.

For boolean values, you can specify `1`, `True`, or `Yes` (case-insensitive) for a positive value. Any other value will be treated as `false`.

- `NOA_JWT_SECRET`
- `NOA_PROD_BASE_URL`
- `NOA_OKTA_URL`
- `NOA_SITE_TITLE`
- `NOA_UNSAFE_DEBUG`
- `NOA_UNSAFE_IGNORE_TOKEN_EXPIRATION`
- `NOA_UNSAFE_INSECURE_COOKIES`

Read more about [how to set environment variables](https://docs.netlify.com/configure-builds/environment-variables/) in Netlify's docs.
