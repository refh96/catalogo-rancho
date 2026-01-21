export async function GET() {
  // For now, return false for isAdmin since we don't have auth set up
  return new Response(JSON.stringify({ 
    isAdmin: false,
    message: 'Authentication not configured' 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
