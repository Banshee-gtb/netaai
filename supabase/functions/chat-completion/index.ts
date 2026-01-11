import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, chatId } = await req.json();

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if chat belongs to user
    const { data: chat, error: chatError } = await supabaseClient
      .from('chats')
      .select('user_id')
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('Chat fetch error:', chatError);
      return new Response(
        JSON.stringify({ error: `Chat error: ${chatError.message}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (chat?.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to chat' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare AI request with e-commerce business context
    const systemMessage = {
      role: 'system',
      content: `You are Neta.ai, an AI assistant specialized in e-commerce education and business growth. You help users with:
- Business strategies and market analysis
- E-commerce operations and optimization
- Brand building and marketing
- Business models and revenue strategies
- Market research and competitor analysis
- Product development and positioning

You provide expert guidance, actionable insights, and step-by-step strategies. You can also help with general tasks like writing, coding, learning, and creative work. Always be helpful, clear, and professional.`
    };

    const aiMessages = [systemMessage, ...messages];

    // Call OnSpace AI
    const aiResponse = await fetch(
      `${Deno.env.get('ONSPACE_AI_BASE_URL')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('ONSPACE_AI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: aiMessages,
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      return new Response(
        JSON.stringify({ error: `AI service error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream response back to client
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat completion error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
