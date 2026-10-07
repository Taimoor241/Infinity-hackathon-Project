import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireUser,AuthError} from '@/lib/auth';
import {prisma} from '@/lib/db';
const draftSchema=z.object({projects:z.array(z.object({name:z.string().nullable(),clientName:z.string().nullable(),description:z.string().nullable(),managerId:z.string().nullable(),deadline:z.string().nullable(),tasks:z.array(z.object({title:z.string().nullable(),description:z.string().nullable(),assigneeId:z.string().nullable(),deadline:z.string().nullable(),estimatedHours:z.number().nullable()}))}))});
function dateOk(v:string|null){return !!v&&/^2026-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}
export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(user.role!=='ADMIN')return NextResponse.json({error:'Only administrators can create projects from transcripts.'},{status:403});
  const body=await req.json();const transcript=body.transcript;const suppliedDraft=body.draft;
  if(typeof transcript!=='string'||!transcript.trim())return NextResponse.json({error:'Transcript cannot be empty.'},{status:400});
  let parsed:any;
  if(suppliedDraft){
   const check=draftSchema.safeParse(suppliedDraft);
   if(!check.success)return NextResponse.json({error:'Draft format is invalid.',issues:check.error.issues},{status:422});
   parsed=check.data;
  }else{
   if(!process.env.GEMINI_API_KEY)return NextResponse.json({error:'AI extraction is not configured. Set GEMINI_API_KEY and restart the app.'},{status:503});
   const directory=await prisma.user.findMany({select:{id:true,name:true,role:true,skills:true}});
   const system=`You are a precise project assistant. Return JSON only, no markdown, with shape {"projects":[{"name":"...","clientName":"...","description":"...","managerId":"PM01","deadline":"YYYY-MM-DD","tasks":[{"title":"...","description":"...","assigneeId":"DEV01","deadline":"YYYY-MM-DD","estimatedHours":12}]}]}. Follow final agreed decisions; later corrections win for dates, hours, owners. Ignore rejected/out-of-scope features: payments, inventory, maps, driver tracking, real email sending, ticketing integration, separate native Android/iOS tasks, per-field or per-FAQ-topic tasks, management-hour tasks. Use only supplied directory IDs; never invent people, and never assign client contacts. Estimated hours are effort, not duration; dates are in 2026 and YYYY-MM-DD. Keep separate projects separate; do not merge tasks just because they share an owner. If a required person/date/value is unresolved, return null instead of guessing. Return JSON only.`;
   const model=process.env.AI_MODEL||'gemini-3.5-flash';
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(60000),body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:`Directory (id, name, role, skills): ${JSON.stringify(directory)}\n\nMeeting transcript:\n${transcript}`}]}],generationConfig:{responseMimeType:'application/json',temperature:0,maxOutputTokens:6000}})});
   if(!response.ok){const status=response.status===429?503:502;return NextResponse.json({error:`Gemini API returned ${response.status}. Check the API key and free-tier quota. Nothing was saved.`},{status})}
   const payload=await response.json();const text=(payload.candidates?.[0]?.content?.parts||[]).map((x:any)=>x.text||'').join('');
   const normalized=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
   let raw:any;try{raw=JSON.parse(normalized)}catch{return NextResponse.json({error:'AI returned malformed JSON. Nothing was saved.'},{status:502})}
   const check=draftSchema.safeParse(raw);if(!check.success)return NextResponse.json({error:'AI output did not match the required draft shape. Nothing was saved.',issues:check.error.issues},{status:422});parsed=check.data;
  }
  const users=await prisma.user.findMany({select:{id:true,role:true}});const byId=new Map(users.map(x=>[x.id,x.role]));const issues:string[]=[];
  parsed.projects.forEach((p:any,i:number)=>{const at=`projects[${i}]`;if(!p.name?.trim())issues.push(`${at}.name`);if(!p.clientName?.trim())issues.push(`${at}.clientName`);if(!p.description?.trim())issues.push(`${at}.description`);if(!dateOk(p.deadline))issues.push(`${at}.deadline (must be a real 2026- date)`);if(!p.managerId||byId.get(p.managerId)!=='MANAGER')issues.push(`${at}.managerId (must be a directory manager)`);p.tasks.forEach((t:any,j:number)=>{const path=`${at}.tasks[${j}]`;if(!t.title?.trim())issues.push(`${path}.title`);if(!t.description?.trim())issues.push(`${path}.description`);if(!t.assigneeId||byId.get(t.assigneeId)!=='AGENT')issues.push(`${path}.assigneeId (must be a directory agent)`);if(!dateOk(t.deadline))issues.push(`${path}.deadline (must be a real 2026- date)`);else if(dateOk(p.deadline)&&t.deadline>p.deadline)issues.push(`${path}.deadline (after project deadline)`);if(typeof t.estimatedHours!=='number'||t.estimatedHours<=0)issues.push(`${path}.estimatedHours (must be positive)`)});});
  if(!parsed.projects.length)issues.push('projects (at least one project required)');
  if(issues.length)return NextResponse.json({error:'Review and correct the unresolved fields before saving.',issues,draft:parsed},{status:422});
  const created=await prisma.$transaction(async tx=>{
   const out=[];
   for(const p of parsed.projects){
    const tasks=p.tasks.map((t:any)=>({title:t.title,description:t.description,assigneeId:t.assigneeId,deadline:new Date(`${t.deadline}T00:00:00.000Z`),estimatedHours:t.estimatedHours}));
    const project=await tx.project.create({data:{name:p.name,clientName:p.clientName,description:p.description,managerId:p.managerId,deadline:new Date(`${p.deadline}T00:00:00.000Z`),tasks:{create:tasks}},include:{_count:{select:{tasks:true}}}});
    out.push({id:project.id,name:project.name,taskCount:project._count.tasks});
   }
   return out;
  });
  return NextResponse.json({created},{status:201});
 }catch(e){const status=e instanceof AuthError?e.status:500;return NextResponse.json({error:e instanceof Error?e.message:'Transcript processing failed. No data was saved.'},{status})}
}
