const GRAPH_API = 'https://graph.facebook.com/v19.0';

function getCredentials() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || token === 'your_long_lived_access_token') {
    throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured. Add it to your environment variables.');
  }
  if (!userId || userId === 'your_instagram_business_account_id') {
    throw new Error('INSTAGRAM_USER_ID is not configured. Add it to your environment variables.');
  }
  return { token, userId };
}

/**
 * Look up an Instagram user's IGSID (scoped user ID) from their username.
 * Only works for users who have previously messaged your account OR who follow you.
 */
export async function findInstagramUserId(username: string): Promise<string> {
  const { token, userId } = getCredentials();

  // Search connected users
  const res = await fetch(
    `${GRAPH_API}/${userId}/linked_instagram_account?fields=id,username&access_token=${token}`
  );

  // Fallback: try to search via Business Discovery API
  const discoveryRes = await fetch(
    `${GRAPH_API}/${userId}?fields=business_discovery.fields(id,username)&business_discovery_user=${encodeURIComponent(username)}&access_token=${token}`
  );
  const discoveryData = await discoveryRes.json();

  if (discoveryData?.business_discovery?.id) {
    return discoveryData.business_discovery.id;
  }

  // Try direct IGSID lookup (works if user has messaged you)
  const searchRes = await fetch(
    `${GRAPH_API}/${userId}/messaging_accounts?access_token=${token}`
  );

  throw new Error(
    `Could not find Instagram user "@${username}". They must have messaged your account first, or you must have their direct IGSID. Try entering their IGSID directly.`
  );
}

/**
 * Send an Instagram DM to a recipient.
 * @param recipientId - Instagram-scoped user ID (IGSID) or username (will attempt lookup)
 * @param message - The message text to send
 */
export async function sendInstagramDm(recipientId: string, message: string): Promise<void> {
  const { token, userId } = getCredentials();

  // If it looks like a username (not all digits), try to look up their ID
  let igScopedId = recipientId.replace('@', '').trim();
  if (!/^\d+$/.test(igScopedId)) {
    igScopedId = await findInstagramUserId(igScopedId);
  }

  const res = await fetch(`${GRAPH_API}/${userId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: igScopedId },
      message: { text: message },
      access_token: token,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const errMsg = data.error?.message || 'Instagram API error';
    const errCode = data.error?.code;

    // Provide helpful context for common error codes
    if (errCode === 10) {
      throw new Error('Permission denied. Ensure your Instagram app has instagram_manage_messages permission and is approved by Meta.');
    }
    if (errCode === 100) {
      throw new Error(`Invalid recipient. The user "@${recipientId}" must have messaged your Instagram account first before you can send them a DM via the API.`);
    }
    throw new Error(errMsg);
  }
}
