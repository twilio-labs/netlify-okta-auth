# netlify-okta-auth Production Configuration

Once you get [netlify-okta-auth working locally](./installation.md), you can move on to deploying to Netlify.

## Deploy your site

The first step is to deploy your site to Netlify. There are multiple ways to do this, and it doesn't matter for `netlify-okta-auth` how you deploy. Refer to [Netlify's documentation](https://docs.netlify.com/site-deploys/overview/) to get your site deployed.

Once you have your site deployed, you will have a production URL such as `https://my-production-site.netlify.app`. In the remainder of this guide, when you see that URL, be sure to replace it with your site's specific URL.

> Netlify allows you to use a custom domain, so if you do that, be sure to replace any references to `https://my-production-site.netlify.app` with your custom domain.

At this point, your site will still not be protected. In fact, it's likely broken and trying to redirect to your `localhost` still. Let's finish the configuration.

## Set up production app in Okta

Now is the time to use your production Okta account. [Follow the same steps](installation.md#okta-for-local-dev-setup) from the installation guide, with the following exceptions:

| Setting                    | Production value                                                 |
| -------------------------- | ---------------------------------------------------------------- |
| **Sign-in redirect URI**   | `https://my-production-site.netlify.app/.netlify/functions/auth` |
| **Sign-out redirect URIs** | `https://my-production-site.netlify.app`                         |

Don't forget to change the domain name to match your Netlify site.

Save the **App Embed Link** as described in the Okta setup instructions for the next step.

## Configure Netlify site

Now, we need to add some environment variables to your Netlify site and configure the access control.

### Determine your JWT secret

The JWT for your site needs to be signed with a shared secret and then we need to tell both Netlify and `netlify-okta-auth` what that secret is.

Use a password generator to generate a string of 64 characters (512 bits, [see this article](https://auth0.com/blog/brute-forcing-hs256-is-possible-the-importance-of-using-strong-keys-to-sign-jwts/)) and keep this somewhere safe.

> 1Password is a good app to generate this string and it can also store it securely. There are many options here, just be sure the string you create is cryptographically random.

For this guide, we will use `your-shared-secret` in place of the key that you generate.

### Environment variables

1. Bring up your site in the [Netlify dashboard](https://app.netlify.com).
2. Go to **Site settings** > **Build & deploy** > **Environment**.
3. Click **Edit settings**.
4. Create the following variables:
   | Key | Value |
   | --- | --- |
   | `O4N_JWT_SECRET` | `your-shared-secret` |
   | `O4N_PROD_BASE_URL` | `https://my-production-site.netlify.app` |
   | `O4N_OKTA_URL` | `https://your-company.okta.com/home/oidc_client/abcdef1234` |
   > See the [configuration reference](./reference.md) for more on these and other settings.
5. Click **Save**.

You will need to adjust these values to match your setup.

### Netlify access control

1. Bring up your site in the [Netlify dashboard](https://app.netlify.com).
2. Go to **Site settings** > **Access control** > **Visitor access**.
3. Click **Set JWT secret**.
4. Paste in your secret (e.g. `your-shared-secret`).
5. Click **Save**.

### Redeploy

To get your new settings to take effect, you need to redeploy your site.

Once you've done that, everything should be working!
