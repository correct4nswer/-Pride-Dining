// Fully offline-working loader (prefilled data).
// Still supports live daily updates when deployed with the Action.

const TAG_GROUPS = {
  gold: ["Breakfast","Lunch","Dinner","Dessert","Grab & Go"],
  green: ["Vegan","Vegetarian"],
  blue: ["Halal"]
};

function tagClass(tag){
  if(TAG_GROUPS.green.includes(tag)) return "tag diet";
  if(TAG_GROUPS.blue.includes(tag)) return "tag halal";
  return "tag";
}

function fmtTimeLabel(range){
  if(!range) return "Hours unavailable";
  return `${range.open} – ${range.close}`;
}

function parseTime12(hm){
  const m = hm?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i);
  if(!m) return null;
  let h = parseInt(m[1],10);
  let min = m[2] ? parseInt(m[2],10) : 0;
  const mer = m[3].toUpperCase();
  if(mer==="PM" && h!==12) h+=12;
  if(mer==="AM" && h===12) h=0;
  return {h,m:min};
}

function isOpenNow(hours){
  const days = ["sun","mon","tue","wed","thu","fri","sat"];
  const now = new Date();
  const tzNow = new Date(now.toLocaleString("en-US", { timeZone:"America/New_York" }));
  const dow = days[tzNow.getDay()];
  const today = hours?.[dow];
  if(!today?.open || !today?.close){ return {open:false, today:null}; }
  const o = parseTime12(today.open);
  const c = parseTime12(today.close);
  if(!o || !c){ return {open:false, today:null}; }
  const start = new Date(tzNow); start.setHours(o.h,o.m,0,0);
  const end   = new Date(tzNow); end.setHours(c.h,c.m,0,0);
  let open = false;
  if(end <= start){
    const endNext = new Date(end.getTime()+24*3600*1000);
    open = (tzNow >= start && tzNow <= endNext);
  }else{
    open = tzNow >= start && tzNow <= end;
  }
  return {open, today};
}

function mapsHref(loc){
  if(loc.lat && loc.lng){
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  const q = encodeURIComponent(`${loc.name} Hofstra University, Hempstead NY`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function makeCard(loc){
  const {open, today} = isOpenNow(loc.hours || {});
  const card = document.createElement("article");
  card.className = "card" + (open ? " open" : "");

  const name = document.createElement("div");
  name.className = "name";
  const title = document.createElement("span");
  title.textContent = loc.name;
  const status = document.createElement("span");
  status.className = `badge ${open ? "open" : "closed"}`;
  status.textContent = open ? "Open" : "Closed";
  name.appendChild(title);
  name.appendChild(status);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = loc.address || loc.building || "Hofstra University, Hempstead, NY";

  const hours = document.createElement("div");
  hours.className = "hours";
  hours.textContent = fmtTimeLabel(today);

  const tags = document.createElement("div");
  tags.className = "tags";
  (loc.tags || []).forEach(t=>{
    const chip = document.createElement("span");
    chip.className = tagClass(t);
    chip.textContent = t;
    tags.appendChild(chip);
  });

  const btn = document.createElement("a");
  btn.className = "btn";
  btn.href = mapsHref(loc);
  btn.target = "_blank";
  btn.rel = "noopener";
  btn.textContent = "Directions";

  card.appendChild(name);
  card.appendChild(btn);
  card.appendChild(meta);
  card.appendChild(document.createElement("div"));
  card.appendChild(hours);
  card.appendChild(document.createElement("div"));
  card.appendChild(tags);
  return {card, open};
}

async function load(){
  const openWrap = document.getElementById("open-cards");
  const closedWrap = document.getElementById("closed-cards");
  try{
    const res = await fetch("data/locations.json?v="+Date.now());
    const list = await res.json();
    const openList = [];
    const closedList = [];
    list.forEach(loc=>{
      const {card, open} = makeCard(loc);
      (open ? openList : closedList).push(card);
    });

    const byTitle = el => el.querySelector(".name span")?.textContent?.toLowerCase() || "";
    openList.sort((a,b)=> byTitle(a).localeCompare(byTitle(b)));
    closedList.sort((a,b)=> byTitle(a).localeCompare(byTitle(b)));

    openList.forEach(c=>openWrap.appendChild(c));
    closedList.forEach(c=>closedWrap.appendChild(c));
  }catch(e){
    const err = document.createElement("pre");
    err.style.color = "#f99";
    err.textContent = "Failed to load data/locations.json.";
    openWrap.appendChild(err);
    console.error(e);
  }
}

load();
