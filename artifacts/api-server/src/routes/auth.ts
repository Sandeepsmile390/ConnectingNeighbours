import * as oidc from "openid-client";
import { Router } from "express";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth.js";

const GetCurrentAuthUserResponse = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    profileImageUrl: z.string().nullable(),
  }).nullable(),
});

const ExchangeMobileAuthorizationCodeBody = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
  state: z.string(),
  nonce: z.string().nullable().optional(),
});

const ExchangeMobileAuthorizationCodeResponse = z.object({
  token: z.string(),
});

const LogoutMobileSessionResponse = z.object({
  success: z.boolean(),
});

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router = Router();

function getOrigin(req: any): string {
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(",")[0].trim();
    return `https://${domain}`;
  }
  const host = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = req.headers["x-forwarded-proto"] || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

function setSessionCookie(res: any, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: any, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function isValidMobileRedirect(url: string): boolean {
  return (
    url.startsWith("neighbors-mobile://") ||
    url.startsWith("exp+neighbors-mobile://") ||
    url.startsWith("exp://")
  );
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.given_name || claims.first_name) as string | null,
    lastName: (claims.family_name || claims.last_name) as string | null,
    profileImageUrl: (claims.picture || claims.profile_image_url) as
      | string
      | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get("/auth/user", (req: any, res: any) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/login", async (req: any, res: any) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
    access_type: "offline",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  // Support mobile deep-link redirect after login
  const mobileRedirect = typeof req.query.mobile_redirect === "string" ? req.query.mobile_redirect : null;
  if (mobileRedirect && isValidMobileRedirect(mobileRedirect)) {
    setOidcCookie(res, "mobile_redirect", mobileRedirect);
  }

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: any, res: any) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);

  // Mobile deep-link redirect: send token via custom scheme instead of setting cookie
  const mobileRedirect = req.cookies?.mobile_redirect;
  if (mobileRedirect && isValidMobileRedirect(mobileRedirect)) {
    res.clearCookie("mobile_redirect", { path: "/" });
    const redirectUrl = new URL(mobileRedirect);
    redirectUrl.searchParams.set("token", sid);
    res.redirect(redirectUrl.toString());
    return;
  }

  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/auth/dev-login", async (req: any, res: any) => {
  const role = req.query.role || "resident";
  const password = req.query.password;
  const mobileRedirect = req.query.mobile_redirect;

  const isDevAdmin = role === "admin";
  if (isDevAdmin && password !== "Admin@1234") {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  const replitId = isDevAdmin ? "dev-admin-id" : "dev-resident-id";
  const email = isDevAdmin ? "admin@dev.local" : "resident@dev.local";
  const firstName = isDevAdmin ? "Dev" : "Dev";
  const lastName = isDevAdmin ? "Admin" : "Resident";
  const username = isDevAdmin ? "dev_admin" : "dev_resident";
  const name = isDevAdmin ? "Dev Admin" : "Dev Resident";
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  try {
    const { neighborhoodUsersTable } = await import("@workspace/db");
    
    // 1. Upsert into core users table
    const userData = {
      id: replitId,
      email,
      firstName,
      lastName,
      profileImageUrl: avatarUrl,
    };

    await db.insert(usersTable)
      .values(userData)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { ...userData, updatedAt: new Date() }
      });

    // 2. Upsert into hyperlocal users table
    await db.insert(neighborhoodUsersTable)
      .values({
        replitId,
        name,
        username,
        avatarUrl,
        isVerified: isDevAdmin,
        isColonyAdmin: isDevAdmin,
        isColonyApproved: isDevAdmin,
      })
      .onConflictDoUpdate({
        target: neighborhoodUsersTable.replitId,
        set: {
          name,
          username,
          avatarUrl,
          isVerified: isDevAdmin,
          isColonyAdmin: isDevAdmin,
          isColonyApproved: isDevAdmin,
        }
      });

    // 3. Create Session
    const sessionData: SessionData = {
      user: {
        id: replitId,
        email,
        firstName,
        lastName,
        profileImageUrl: avatarUrl,
      },
      access_token: "mock-access-token",
      expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    };

    const sid = await createSession(sessionData);

    // 4. Redirect
    if (mobileRedirect && isValidMobileRedirect(mobileRedirect)) {
      const redirectUrl = new URL(mobileRedirect);
      redirectUrl.searchParams.set("token", sid);
      res.redirect(redirectUrl.toString());
      return;
    }

    setSessionCookie(res, sid);
    res.redirect("/");
  } catch (err: any) {
    req.log.error({ err }, "Dev login failed");
    res.status(500).json({ error: "Dev login failed", details: err.message });
  }
});

router.get("/logout", async (req: any, res: any) => {
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  res.redirect(origin);
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: any, res: any) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

    try {
      const config = await getOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: any, res: any) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

router.post("/auth/promote-admin", async (req: any, res: any) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { neighborhoodUsersTable, eq } = await import("@workspace/db");
    const { getOrCreateNeighborhoodUser } = await import("./users.js");
    const nbUser = await getOrCreateNeighborhoodUser(req);
    if (!nbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { password } = req.body;
    if (password === "Admin@1234") {
      const [updated] = await db.update(neighborhoodUsersTable)
        .set({
          isColonyAdmin: true,
          isVerified: true,
          isColonyApproved: true,
        })
        .where(eq(neighborhoodUsersTable.id, nbUser.id))
        .returning();
      res.json({ success: true, user: updated });
    } else {
      res.status(400).json({ error: "Invalid password" });
    }
  } catch (err: any) {
    req.log.error({ err }, "Failed to promote user to admin");
    res.status(500).json({ error: "Failed to promote user to admin" });
  }
});

export default router;
