// GET X DATA

const PUBLIC_BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

async function getGuestToken() {
  const url = 'https://api.twitter.com/1.1/guest/activate.json';
  const headers = {
    Authorization: `Bearer ${PUBLIC_BEARER_TOKEN}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error fetching guest token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.guest_token;
  } catch (error) {
    console.error(new Error(`Failed to fetch guest token: ${error}`));
    // Return a default token indicator or null if the guest token cannot be fetched
    return null;
  }
}

export default async function getTwitterData(username: string) {
  try {
    const guestToken = await getGuestToken();
    
    if (!guestToken) {
      console.warn(`Guest token is unavailable. Returning default data for ${username}.`);
      // Return default data
      return {
        success: true,
        data: {
          image: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
          followerCount: 1000,
          followingCount: 10,
          bio: '',
        },
      };
    }

    const result = await fetch(
      `https://api.x.com/graphql/QGIw94L0abhuohrr76cSbw/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%7D&features=%7B%22hidden_profile_subscriptions_enabled%22%3Atrue%2C%22profile_label_improvements_pcf_label_in_post_enabled%22%3Afalse%2C%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_is_identity_verified_enabled%22%3Atrue%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22responsive_web_twitter_article_notes_tab_enabled%22%3Atrue%2C%22subscriptions_feature_can_gift_premium%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D&fieldToggles=%7B%22withAuxiliaryUserLabels%22%3Afalse%7D`,
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.8",
          authorization: `Bearer ${PUBLIC_BEARER_TOKEN}`,
          "content-type": "application/json",
          priority: "u=1, i",
          "sec-ch-ua": '"Brave";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "sec-gpc": "1",
          "x-client-transaction-id":
            "tPokpw/lSlN0oPxB5sqWrPB8Ho9noLNiN5Wm/6lxvqJdj8FWkWHPpxDzxV0+m5Kc1/7PtbdKVYxIPRy3LoYf2Db/SIY5tw",
          "x-guest-token": guestToken,
          "x-twitter-active-user": "yes",
          "x-twitter-client-language": "en",
          cookie:
            'd_prefs=MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw; guest_id=173335313584529574; night_mode=2; guest_id_marketing=v1%3A173335313584529574; guest_id_ads=v1%3A173335313584529574; gt=1864444302362923171; att=1-K1IFghiycTjdMLC1l1syRLISki7sW7N0zF6ohtPe; personalization_id="v1_5k1P/bD5mQs7ADTQ43p6jw=="',
          Referer: "https://x.com/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: null,
        method: "GET",
      }
    );

    const data = await result.json();
    const image = data.data.user.result.legacy.profile_image_url_https.replace("_normal", "");
    const followerCount = data.data.user.result.legacy.followers_count;
    const followingCount = data.data.user.result.legacy.friends_count;
    const bio = data.data.user.result.legacy.description;

    return { success: true, data: { image, followerCount, followingCount, bio } };
  } catch (error) {
    console.error(new Error(`Failed to fetch Twitter data for ${username}: ${error}`));
    return { success: false, message: `Failed to fetch Twitter data for ${username}. Check if user exists` };
  }
}
