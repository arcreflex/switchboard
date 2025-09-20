// Cloudflare Worker stub for Twilio SMS/MMS ingress webhook.
export default {
  async fetch(request: Request) {
    console.log("sms-ingress worker received request", { url: request.url });
    return new Response("sms-ingress worker placeholder", { status: 200 });
  }
};
