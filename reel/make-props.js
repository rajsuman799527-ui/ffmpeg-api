// Builds props.json for Remotion from the workflow inputs.
const fs = require('fs');
const zlib = require('zlib');
let planText;
if (process.env.PLAN_B64) {
  planText = zlib.gunzipSync(Buffer.from(process.env.PLAN_B64, 'base64')).toString('utf8');
} else {
  planText = fs.readFileSync('test/plan.json', 'utf8');
}
const plan = JSON.parse(planText);
fs.writeFileSync('plan.json', JSON.stringify(plan));
fs.writeFileSync('props.json', JSON.stringify({ plan, videoFile: 'source.mp4', cutoutFile: process.env.CUT || '', hasSfx: true }));
console.log('scenes', (plan.scenes || []).length, 'captions', (plan.captions || []).length, 'duration', plan.duration);
