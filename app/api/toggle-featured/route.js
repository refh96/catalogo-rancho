export async function POST() {
  // Return unauthorized since we don't have auth set up
  return new Response(JSON.stringify({ 
    error: 'Authentication not configured',
    success: false
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
