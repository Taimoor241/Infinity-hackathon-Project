import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import type { Role } from '@prisma/client';
const cookieName='nw_session';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw new Error('SESSION_SECRET must be at least 32 characters.');return new TextEncoder().encode(s)}
export type SessionUser={id:string;name:string;role:Role};
export async function createSession(u:SessionUser){const production=process.env.NODE_ENV==='production';const token=await new SignJWT({id:u.id,name:u.name,role:u.role}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret());(await cookies()).set(cookieName,token,{httpOnly:true,secure:production,sameSite:production?'none':'lax',path:'/',maxAge:604800})}
export async function clearSession(){(await cookies()).delete(cookieName)}
export async function currentUser():Promise<SessionUser|null>{try{const token=(await cookies()).get(cookieName)?.value;if(!token)return null;const {payload}=await jwtVerify(token,secret());const u=await prisma.user.findUnique({where:{id:String(payload.id)},select:{id:true,name:true,role:true}});return u as SessionUser|null}catch{return null}}
export async function requireUser(){const u=await currentUser();if(!u)throw new AuthError(401,'Unauthenticated');return u}
export class AuthError extends Error{constructor(public status:number,message:string){super(message)}}
