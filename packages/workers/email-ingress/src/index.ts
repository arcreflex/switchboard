// Cloudflare Email Worker stub that will normalize inbound email events.
export default {
  async fetch(request: Request) {
    console.log("email-ingress worker received request", { url: request.url });
    return new Response("email-ingress worker placeholder", { status: 200 });
  }
};
