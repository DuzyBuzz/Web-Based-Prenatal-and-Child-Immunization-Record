export const environment = {
  production: false,
  adminEmail: 'prenatalimmunization@gmail.com',
  firebaseConfig: {
    apiKey: 'AIzaSyCBsW0jz-bZ91ClmueNXBtkd1XmF18NIM0',
    authDomain: 'prenatal-and-immunization.firebaseapp.com',
    projectId: 'prenatal-and-immunization',
    storageBucket: 'prenatal-and-immunization.appspot.com',
    messagingSenderId: '276896027954',
    appId: '1:276896027954:web:6eb1844e5ad0778b3f332b',
  },
  smsApiKey: '46a41b56a940789fc2ef1178f6151a79d8639ec4',
  // Direct provider endpoints (calling iprogsms directly from the browser)
  smsApiUrl: 'https://www.iprogsms.com/api/v1/sms_messages',
  smsReminderUrl: 'https://www.iprogsms.com/api/v1/message-reminders',
  // Optional: absolute Cloud Function URL fallback if hosting rewrites are not deployed.
  // Set this in development only if you need to call the functions endpoint directly.
  // smsFunctionUrl: 'https://us-central1-YOUR_PROJECT.cloudfunctions.net/api/send-sms'
};
