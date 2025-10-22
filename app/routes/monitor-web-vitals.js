// app/routes/monitor-web-vitals.js
export async function action({ request }) {
    const webVitalsData = await request.json();

    console.log('Web Vitals Received:', webVitalsData);
    // Process your web vitals data here

    return new Response('OK', { status: 200 });
}