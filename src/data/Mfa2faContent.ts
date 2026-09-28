
export default {

    ADMIN_MFA_2FA_QR_CODE: {
        title: { type: `TITLE`, data: `Follow the below steps to set up an OTP Authenticator.` },
        steps: [
            { type: `TEXT`, data: `Download an authenticator app of your choice and open it.` },
            {
                type: `URL`,
                data: {
                    google: {
                        playStore: `https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en_IN&pli=1`,
                        appStore: `https://apps.apple.com/us/app/google-authenticator/id388497605`
                    },
                    microsoft: {
                        playStore: `https://play.google.com/store/apps/details?id=com.azure.authenticator&hl=en_IN`,
                        appStore: `https://apps.apple.com/us/app/microsoft-authenticator/id983156458`
                    }
                }
            },
            { type: `TEXT`, data: `Scan the QR or enter the code manually on the authenticator app.` },
            { type: `QR-CODE`, data: { base64: ``, value: ``, subtitle: `or enter the code manually` } },
            { type: `TEXT`, data: `Once you get the OTP code on your authenticator app, click NEXT below and enter the code.` },
        ]
    },

    MFA_2FA_QR_CODE: {
        title: { type: `TITLE`, data: `Follow the below steps to set up an OTP Authenticator.` },
        steps: [
            { type: `TEXT`, data: `Download an authenticator app of your choice and open it.` },
            {
                type: `URL`,
                data: {
                    google: {
                        playStore: `https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en_IN&pli=1`,
                        appStore: `https://apps.apple.com/us/app/google-authenticator/id388497605`
                    },
                    microsoft: {
                        playStore: `https://play.google.com/store/apps/details?id=com.azure.authenticator&hl=en_IN`,
                        appStore: `https://apps.apple.com/us/app/microsoft-authenticator/id983156458`
                    }
                }
            },
            { type: `TEXT`, data: `Scan the QR or enter the code manually on the authenticator app.` },
            { type: `QR-CODE`, data: { base64: ``, value: ``, subtitle: `or enter the code manually` } },
            { type: `TEXT`, data: `Once you get the OTP code on your authenticator app, click NEXT below and enter the code.` },
        ]
    },

}