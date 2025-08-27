// ShadowFightLite - simple 2D fight demo
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 1280, H = 720;
canvas.width = W; canvas.height = H;

const stageLabel = document.getElementById('stage');
const pfill = document.getElementById('pfill');
const efill = document.getElementById('efill');
const msg = document.getElementById('msg');

let Stage = 1;
const MaxStage = 3;
const MaxHP = 100;

let input = {left:false,right:false,attack:false,block:false};

function makeActor(x, flip=false){
  return {
    x, y: H-160, w:60, h:130,
    vx:0,
    flip,
    hp:MaxHP,
    damage:10,
    speed:280,
    state:"idle",
    animTime:0,
    hitbox:null,
    dead:false
  };
}

let player = makeActor(220,false);
let enemy = makeActor(W-280,true);

// set stage stats
function applyStage(){
  player.hp = MaxHP;
  player.dead = false;
  player.state = "idle";
  if(Stage===1){
    enemy.hp = 60; enemy.damage=6; enemy.speed=220;
  } else if(Stage===2){
    enemy.hp = 90; enemy.damage=9; enemy.speed=260;
  } else {
    enemy.hp = 140; enemy.damage=12; enemy.speed=300;
  }
  enemy.dead = false;
  enemy.state = "idle";
  msg.textContent = "";
  stageLabel.textContent = "Stage " + Stage;
  updateBars();
}

applyStage();

function updateBars(){
  pfill.style.width = Math.max(0, player.hp)/MaxHP*100 + "%";
  efill.style.width = Math.max(0, enemy.hp)/MaxHP*100 + "%";
}

function clamp(v,a,b){return Math.min(b,Math.max(a,v));}

let lastTime = performance.now();
let eAttackCooldown = 0;

function gameLoop(t){
  const dt = Math.min(0.05, (t-lastTime)/1000);
  lastTime = t;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(dt){
  // Player controls
  if(!player.dead){
    if(input.left) player.vx = -player.speed;
    else if(input.right) player.vx = player.speed;
    else player.vx = 0;
    player.x += player.vx * dt;
    player.x = clamp(player.x, 80, W-80);
    if(input.attack && player.state!=='attacking'){
      player.state = 'attacking'; player.animTime = 0;
      spawnPlayerHit();
    } else if(input.block) {
      player.state = 'blocking';
    } else if(player.vx!==0){
      player.state = 'run';
    } else if(player.state!=='attacking' && player.state!=='hit'){
      player.state = 'idle';
    }
  }

  // Player attack lifecycle
  if(player.state==='attacking'){
    player.animTime += dt;
    if(player.animTime > 0.18) {
      // attack done
      player.state = 'idle';
      player.hitbox = null;
    }
  }

  // Enemy AI simple
  if(!enemy.dead){
    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);
    enemy.flip = dx < 0 ? true : false;
    eAttackCooldown -= dt;
    if(dist > 130){
      // move closer
      enemy.state = 'run';
      enemy.vx = (dx>0?1:-1) * enemy.speed;
      enemy.x += enemy.vx * dt;
    } else {
      // in range: attack occasionally or block
      enemy.vx = 0;
      if(eAttackCooldown <= 0 && Math.random() < 0.6){
        enemy.state = 'attacking';
        enemy.animTime = 0;
        spawnEnemyHit();
        eAttackCooldown = 0.9 + Math.random()*0.6;
      } else if(Math.random()<0.15){
        enemy.state = 'blocking';
        setTimeout(()=>{ if(!enemy.dead) enemy.state='idle'; }, 600);
      } else {
        if(enemy.state!=='attacking' && enemy.state!=='blocking') enemy.state='idle';
      }
    }
  }

  if(enemy.state==='attacking'){
    enemy.animTime += dt;
    if(enemy.animTime > 0.18){
      enemy.state = 'idle';
      enemy.hitbox = null;
    }
  }

  // resolve hit collisions
  if(player.hitbox && !enemy.dead){
    if(rectOverlap(player.hitbox, enemy)){
      // if enemy blocking reduce damage
      let dmg = player.damage;
      if(enemy.state==='blocking') dmg = Math.ceil(dmg*0.25);
      enemy.hp -= dmg;
      enemy.state = 'hit';
      enemy.animTime = 0;
      player.hitbox = null;
      if(enemy.hp <= 0){ enemy.dead = true; enemy.state='dead'; onEnemyKO(); }
      updateBars();
    }
  }
  if(enemy.hitbox && !player.dead){
    if(rectOverlap(enemy.hitbox, player)){
      let dmg = enemy.damage;
      if(player.state==='blocking') dmg = Math.ceil(dmg*0.25);
      player.hp -= dmg;
      player.state = 'hit'; player.animTime=0;
      enemy.hitbox = null;
      if(player.hp <= 0){ player.dead = true; player.state='dead'; onPlayerKO(); }
      updateBars();
    }
  }

  // small timers for hit 'flash'
  if(player.state==='hit'){ player.animTime += dt; if(player.animTime>0.25) player.state='idle'; }
  if(enemy.state==='hit'){ enemy.animTime += dt; if(enemy.animTime>0.25) enemy.state='idle'; }
}

function onEnemyKO(){
  msg.textContent = "Stage Cleared!";
  setTimeout(()=>{
    Stage++;
    if(Stage > MaxStage){
      msg.textContent = "YOU WIN!";
    } else {
      applyStage();
    }
  }, 900);
}

function onPlayerKO(){
  msg.textContent = "DEFEAT - Press R to retry";
}

function spawnPlayerHit(){
  const dir = 1;
  const hx = player.x + (dir*80);
  player.hitbox = {x: hx-18, y: player.y-110, w:36, h:80};
}

function spawnEnemyHit(){
  const dir = -1*(enemy.flip? -1:1);
  const hx = enemy.x + (enemy.flip? -80:80) * -1;
  enemy.hitbox = {x: enemy.x + (enemy.flip?-80:80)-18, y: enemy.y-110, w:36, h:80};
}

function rectOverlap(a,b){
  return !(a.x + a.w < b.x - b.w*0.5 || a.x > b.x + b.w*0.5 || a.y + a.h < b.y - b.h*0.5 || a.y > b.y + b.h*0.5);
}

function draw(){
  // background
  ctx.clearRect(0,0,W,H);
  // ground
  ctx.fillStyle = "#0f0f13";
  ctx.fillRect(0,H-120,W,120);
  // arena shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0,H-120,W,40);

  // draw player and enemy as silhouettes
  drawActor(enemy, "#b33");
  drawActor(player, "#3bd");

  // debug hitboxes (invisible by default, but we can render small flashes)
  // show fading hitboxes:
  if(player.hitbox){
    ctx.fillStyle = "rgba(59,189,255,0.14)";
    ctx.fillRect(player.hitbox.x, player.hitbox.y, player.hitbox.w, player.hitbox.h);
  }
  if(enemy.hitbox){
    ctx.fillStyle = "rgba(255,80,80,0.14)";
    ctx.fillRect(enemy.hitbox.x, enemy.hitbox.y, enemy.hitbox.w, enemy.hitbox.h);
  }
}

function drawActor(a, color){
  ctx.save();
  ctx.translate(a.x, a.y);
  // simple silhouette with small bob when running
  const bob = (a.state==='run')? Math.sin(performance.now()/80)*4 : 0;
  ctx.translate(0,bob);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.ellipse(0, a.h/2 + 10, a.w, 12, 0, 0, Math.PI*2); ctx.fill();
  // body
  if(a.dead) ctx.globalAlpha = 0.5;
  if(a.state==='hit') ctx.globalAlpha = 0.6;
  ctx.fillStyle = color;
  ctx.fillRect(-a.w/2, -a.h, a.w, a.h);
  // head
  ctx.fillRect(-a.w/4, -a.h-20, a.w/2, 16);
  ctx.restore();
}

window.addEventListener('keydown', e=>{
  if(e.key==='ArrowLeft' || e.key==='a' || e.key==='A') input.left = true;
  if(e.key==='ArrowRight' || e.key==='d' || e.key==='D') input.right = true;
  if(e.key==='j' || e.key==='J') input.attack = true;
  if(e.key==='k' || e.key==='K') input.block = true;
  if(e.key==='r' || e.key==='R') {
    if(player.dead || enemy.dead || msg.textContent.includes('YOU WIN')){
      // restart full game
      if(Stage>MaxStage){ Stage=1; }
      applyStage();
    }
  }
});
window.addEventListener('keyup', e=>{
  if(e.key==='ArrowLeft' || e.key==='a' || e.key==='A') input.left = false;
  if(e.key==='ArrowRight' || e.key==='d' || e.key==='D') input.right = false;
  if(e.key==='j' || e.key==='J') input.attack = false;
  if(e.key==='k' || e.key==='K') input.block = false;
});

// touch controls (basic): tap left/right side to move, double-tap right for attack
let lastTap = 0;
canvas.addEventListener('touchstart', (ev)=>{
  const x = ev.touches[0].clientX - canvas.getBoundingClientRect().left;
  const now = performance.now();
  if(x < W/2) { input.left = true; } else { input.right = true; }
  if(now - lastTap < 300){ input.attack = true; setTimeout(()=>input.attack=false,120); }
  lastTap = now;
});
canvas.addEventListener('touchend', ()=>{ input.left=false; input.right=false; });

requestAnimationFrame(gameLoop);