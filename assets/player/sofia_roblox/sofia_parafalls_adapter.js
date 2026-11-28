/* Sofía Roblox 30-authored-frame atlas renderer — HTML5 Canvas 2D.
 * V58.8.33: atlas de la Sofía cúbica oficial (durationsMs por cuadro; si no hay, fps por animación).
 * Does not mutate game physics, attack boxes, camera, or the world map.
 * Root x,feetY stay in world coordinates. Metadata includes alpha contour trimming.
 */
(function (target) {
  'use strict';
  const map = {standing:'idle',moving:'walk',running:'run',jumping:'jump',falling:'fall',
               landing:'land',climbing:'climb',gliding:'glide',taking_damage:'hurt',
               attacking:'attack',interacting:'interact',crouching:'crouch'};
  function draw(ctx, img, atlas, state, seconds, centerX, feetY, options) {
    options=options||{};
    // V58.8.35: acepta también un lienzo (silueta roja del destello de daño), que no tiene complete/naturalWidth.
    const isCanvas=!!img && !('complete' in img) && img.width>0;
    if (!img || (!isCanvas && (!img.complete || !img.naturalWidth)) || !atlas || !atlas.animations)return false;
    state=map[state]||state;
    const anim=atlas.animations[state]||atlas.animations.idle;
    const frames=anim.frames;
    const t=Math.max(0,Number(seconds)||0);
    let idx;
    const durs=anim.durationsMs;
    if (Array.isArray(durs) && durs.length===frames.length) {
      // V58.8.33: duración propia de cada cuadro (atlas de la Sofía cúbica); sin bucle se queda en el último.
      const total=durs.reduce((s,d)=>s+d,0);
      let ms=anim.loop ? (t*1000)%total : Math.min(t*1000,total-1);
      idx=0; while (idx<frames.length-1 && ms>=durs[idx]) { ms-=durs[idx]; idx++; }
    } else idx=anim.loop ? Math.floor(t*anim.fps)%frames.length : Math.min(frames.length-1,Math.floor(t*anim.fps));
    const f=atlas.frames[frames[idx]];
    if (!f)return false;
    const src=f.frame,off=f.spriteSourceSize;
    const scale=Math.max(.01,Math.min(2,Number(options.scale)||.29));
    const facing=options.facing === -1 ? -1 : 1;
    const px=f.pivot.x*f.sourceSize.w,py=f.pivot.y*f.sourceSize.h;
    ctx.save(); ctx.translate(centerX,feetY); ctx.scale(facing,1);
    if (Number.isFinite(options.opacity))ctx.globalAlpha*=Math.max(0,Math.min(1,options.opacity));
    ctx.drawImage(img,src.x,src.y,src.w,src.h,
       (off.x-px)*scale,(off.y-py)*scale,src.w*scale,src.h*scale);
    ctx.restore();
    return true;
  }
  target.SofiaRobloxAtlas = Object.freeze({draw,poseCount:30,
    getFrames(meta,state){return (meta.animations[state]||meta.animations.idle).frames.slice();}});
})(typeof window!=='undefined'?window:globalThis);
