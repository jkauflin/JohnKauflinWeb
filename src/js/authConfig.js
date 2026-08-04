/*==============================================================================
(C) Copyright 2026 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Configuration for authentication and API calls using MSAL.js 
              and Azure AD.  This will work for both local development and 
              production deployment.  It uses the msal-browser library to 
              handle authentication and token acquisition (which is 
              included in the fetchApi function in util.js)
              
--------------------------------------------------------------------------------
Modification History
2026-08-04 JJK  Initial version - added for new auth and Function API calls
================================================================================*/

const msalConfig = {
    auth: {
        clientId: "39494882-3d4a-4ba1-a756-985acd5d42bb",
        authority: "https://login.microsoftonline.com/69b45237-b1d8-4ef3-b620-ddb23592e2f3",
        redirectUri: window.__APP_CONFIG__.isLocal
            ? "http://localhost:4280"
            : "https://johnkauflin.com"
    },
    cache: {
        cacheLocation: "sessionStorage" // or localStorage if you want persistence across tabs
    }
};

const apiScopes = ["api://d12f5b02-ce09-47a5-ab32-1adba17e382f/user_impersonation"];

const msalInstance = new msal.PublicClientApplication(msalConfig);
let initPromise = msalInstance.initialize();

export async function getToken() {
    await initPromise;
    const accounts = msalInstance.getAllAccounts();
    const request = { scopes: apiScopes };

    if (accounts.length > 0) {
        request.account = accounts[0];
        try {
            const result = await msalInstance.acquireTokenSilent(request);
            return result.accessToken;
        } catch (err) {
            if (!(err instanceof msal.InteractionRequiredAuthError)) throw err;
        }
    }

    // No cached account, or silent failed — go interactive
    const result = await msalInstance.acquireTokenPopup(request);
    // or acquireTokenRedirect(request) if you'd rather avoid popups
    return result.accessToken;
}
