/* Synced from Leomgl/link-app PR #5: do not edit independently. */
/**
 * Reusable iOS-friendly "Me notifier" editor, identical across apps.
 * Presentation and configuration ONLY: no fetch, subscription or push calls.
 * Host PWA listens to link-notify-change and sends opaque intents via LINK SDK.
 *
 * Apps vendor this file alongside notification-schedule-config.mjs from
 * the same reviewed commit; do not duplicate scheduling logic in each PWA.
 */
import {
 emptyNotificationSchedule,validateNotificationSchedule,
 NOTIFICATION_SCHEDULE_MAX_RULES
} from "./notification-schedule-config.mjs";

const unitLabels={days:"Jours",hours:"Heures",minutes:"Minutes"};
const unitLimit={days:90,hours:2160,minutes:129600};
const styles=[
 ":host{display:block;color:var(--link-notify-fg,#20222c);font:inherit;font-family:inherit;}",
 ".panel{border:1px solid var(--link-notify-border,#d9dce3);border-radius:16px;padding:16px;",
 "background:var(--link-notify-bg,transparent)}",
 ".head,.line,.actions{display:flex;justify-content:space-between;align-items:center;gap:12px}",
 ".head{min-height:44px}.title{font-size:16px;font-weight:700}",
 ".sub,.hint{font-size:12px;color:var(--link-notify-muted,#777d8a);line-height:1.45}",
 ".switch{display:flex;align-items:center;gap:8px;font-size:13px}",
 ".switch input{accent-color:var(--link-notify-accent,#d91f1a);width:20px;height:20px}",
 ".content{margin-top:14px;border-top:1px solid var(--link-notify-border,#d9dce3);padding-top:12px}",
 ".line{border:1px solid var(--link-notify-border,#d9dce3);padding:9px;border-radius:10px;margin:8px 0}",
 ".line strong{font-size:13px}.actions{gap:6px}.minor{font-size:12px}",
 "button{font:inherit;cursor:pointer;min-height:42px;padding:7px 10px;border-radius:9px;",
 "background:transparent;color:inherit;border:1px solid var(--link-notify-border,#d9dce3)}",
 "button:focus-visible,input:focus-visible{outline:2px solid var(--link-notify-accent,#d91f1a);outline-offset:2px}",
 "button[aria-pressed=true],button.primary{background:var(--link-notify-accent,#d91f1a);color:white;border-color:transparent}",
 ".units{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0 12px}",
 ".mode{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:12px 0}",
 ".section{padding-top:12px;margin-top:12px;border-top:1px solid var(--link-notify-border,#d9dce3)}",
 ".field{display:flex;flex-direction:column;gap:5px;flex:1;font-size:13px}",
 "input[type=number],input[type=date],input[type=time]{width:100%;box-sizing:border-box;",
 "min-height:44px;font:inherit;color:inherit;background:transparent;",
 "border:1px solid var(--link-notify-border,#d9dce3);border-radius:9px;padding:8px}",
 ".fields{display:flex;align-items:end;gap:8px}",
 ".error{color:var(--link-notify-error,#b42318);font-size:12px;min-height:1.3em;margin-top:6px}",
 ".footer{font-size:12px;margin-top:12px;color:var(--link-notify-muted,#777d8a)}",
 "@media(prefers-color-scheme:dark){:host{--link-notify-fg:#f2f2f5;--link-notify-border:#45454e;",
 "--link-notify-muted:#b1b1ba;--link-notify-error:#ff9b91}}"
].join("");
const el=(tag,cls="",text=null)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(text!==null)node.textContent=text;return node;
};
const currentLocal=utc=>{
 const d=new Date(utc);
 const pad=n=>String(n).padStart(2,"0");
 return {date:[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-"),
  time:pad(d.getHours())+":"+pad(d.getMinutes())};
};
const fromLocal=(day,time)=>{
 if(!/^\d{4}-\d\d-\d\d$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  throw Error("Choisis une date et une heure valides.");
 const [y,m,d]=day.split("-").map(Number),[h,min]=time.split(":").map(Number);
 const date=new Date(y,m-1,d,h,min,0,0);
 if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d||
    date.getHours()!==h||date.getMinutes()!==min)
  throw Error("Cette heure n’existe pas dans le fuseau actuel.");
 return date.toISOString();
};

export class LinkNotifyPicker extends HTMLElement {
 constructor(){
  super();this.attachShadow({mode:"open"});
  this._value=emptyNotificationSchedule();
  this._eventAt=null;this._mode="relative";this._unit="minutes";
  this._amount="15";this._date="";this._time="09:00";this._editId=null;
 }
 connectedCallback(){this.render()}
 get value(){return this._value}
 set value(config){this._value=validateNotificationSchedule(config);if(this.isConnected)this.render()}
 get eventAt(){return this._eventAt}
 set eventAt(iso){this._eventAt=iso;if(this.isConnected)this.render()}
 change(next){
  this.value=next;
  this.dispatchEvent(new CustomEvent("link-notify-change",{
   detail:{schedule:this._value},bubbles:true,composed:true
  }));
 }
 render(){
  const root=this.shadowRoot;root.replaceChildren();
  const style=el("style");style.textContent=styles;root.append(style);
  const panel=el("section","panel");
  const head=el("div","head");
  const heading=el("div");
  heading.append(el("div","title","Me notifier"),
   el("div","sub","Des alertes personnalisées, envoyées par LINK"));
  const toggle=el("label","switch");
  const checkbox=el("input");checkbox.type="checkbox";checkbox.checked=this._value.enabled;
  checkbox.setAttribute("aria-label","Activer les notifications pour cet élément");
  checkbox.addEventListener("change",()=>this.change({...this._value,enabled:checkbox.checked}));
  toggle.append(checkbox,el("span","","Activer"));
  head.append(heading,toggle);panel.append(head);
  if(!this._value.enabled){
   panel.append(el("p","hint","Aucune notification ne sera envoyée pour cet élément."));
   root.append(panel);return;
  }
  const content=el("div","content");
  const count=el("div","line");
  count.append(el("strong","","Mes notifications"),el("span","hint",
   this._value.rules.length+"/"+NOTIFICATION_SCHEDULE_MAX_RULES));
  content.append(count);
  for(const rule of this._value.rules){
   const line=el("div","line"),title=el("strong","",
    rule.kind==="relative"?
     rule.value+" "+unitLabels[rule.unit].toLowerCase()+" avant":
     "Le "+new Date(rule.at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}));
   const buttons=el("div","actions");
   const edit=el("button","minor","Modifier");edit.type="button";
   edit.setAttribute("aria-label","Modifier cette notification");
   edit.addEventListener("click",()=>{
    this._editId=rule.id;this._mode=rule.kind;
    if(rule.kind==="relative"){this._unit=rule.unit;this._amount=String(rule.value)}
    else {const local=currentLocal(rule.at);this._date=local.date;this._time=local.time}
    this.render();
   });
   const remove=el("button","minor","Retirer");remove.type="button";
   remove.setAttribute("aria-label","Supprimer cette notification");
   remove.addEventListener("click",()=>{
    if(this._editId===rule.id)this._editId=null;
    this.change({...this._value,rules:this._value.rules.filter(x=>x.id!==rule.id)});
   });
   buttons.append(edit,remove);line.append(title,buttons);content.append(line);
  }
  if(this._value.rules.length<NOTIFICATION_SCHEDULE_MAX_RULES||this._editId){
   const section=el("div","section");
   section.append(el("strong","",this._editId?"Modifier une notification":"Ajouter une notification"));
   const mode=el("div","mode");
   for(const [id,name] of [["relative","Avant l’échéance"],["fixed","Date et heure précises"]]){
    const button=el("button","",name);button.type="button";
    button.setAttribute("aria-pressed",String(this._mode===id));
    button.addEventListener("click",()=>{this._mode=id;this.render()});
    mode.append(button);
   }
   section.append(mode);
   const form=el("form");form.noValidate=true;
   if(this._mode==="relative"){
    if(this._eventAt===null)section.append(el("p","hint",
     "Définis d’abord une échéance dans cet élément pour utiliser une anticipation."));
    const units=el("div","units");units.setAttribute("role","group");
    units.setAttribute("aria-label","Choisir jours, heures ou minutes");
    for(const [u,name] of Object.entries(unitLabels)){
     const button=el("button","",name);button.type="button";
     button.setAttribute("aria-pressed",String(this._unit===u));
     button.addEventListener("click",()=>{this._unit=u;this.render()});units.append(button);
    }
    form.append(units);
    const fields=el("div","fields"),label=el("label","field");
    label.append(el("span","","Nombre de "+unitLabels[this._unit].toLowerCase()));
    const input=el("input");input.type="number";input.min="1";
    input.max=String(unitLimit[this._unit]);input.step="1";input.value=this._amount;
    input.addEventListener("input",()=>{this._amount=input.value});
    label.append(input);fields.append(label);
    form.append(fields);
   }else{
    const fields=el("div","fields");
    const dateLabel=el("label","field");
    dateLabel.append(el("span","","Date"));
    const dateInput=el("input");dateInput.type="date";dateInput.value=this._date;
    dateInput.addEventListener("change",()=>{this._date=dateInput.value});
    dateLabel.append(dateInput);
    const timeLabel=el("label","field");
    timeLabel.append(el("span","","Heure"));
    const timeInput=el("input");timeInput.type="time";timeInput.value=this._time;
    timeInput.addEventListener("change",()=>{this._time=timeInput.value});
    timeLabel.append(timeInput);fields.append(dateLabel,timeLabel);form.append(fields);
   }
   const actions=el("div","actions");actions.style.marginTop="10px";
   const save=el("button","primary",this._editId?"Enregistrer":"Ajouter");
   save.type="submit";
   if(this._mode==="relative"&&this._eventAt===null)save.disabled=true;
   actions.append(save);
   if(this._editId){
    const cancel=el("button","","Annuler");cancel.type="button";
    cancel.addEventListener("click",()=>{this._editId=null;this.render()});
    actions.append(cancel);
   }
   const errorMessage=el("p","error");errorMessage.setAttribute("role","status");
   form.append(actions,errorMessage);
   form.addEventListener("submit",event=>{
    event.preventDefault();
    try{
     let next;
     const id=this._editId||crypto.randomUUID();
     if(this._mode==="relative"){
      const value=Number(this._amount);
      if(!Number.isInteger(value)||value<1||value>unitLimit[this._unit])
       throw Error("Saisis une valeur entière positive, dans la limite de 90 jours.");
      if(!this._eventAt)throw Error("Ajoute d’abord une échéance.");
      next={id,kind:"relative",unit:this._unit,value};
     }else{
      const at=fromLocal(this._date,this._time);
      if(Date.parse(at)<=Date.now())throw Error("Choisis un horaire dans le futur.");
      next={id,kind:"fixed",at};
     }
     if(this._value.rules.some(r=>r.id!==id&&
      (next.kind==="relative"&&r.kind==="relative"&&r.unit===next.unit&&r.value===next.value||
       next.kind==="fixed"&&r.kind==="fixed"&&r.at===next.at)))
      throw Error("Cette notification existe déjà.");
     const rules=this._editId?
      this._value.rules.map(r=>r.id===id?next:r):[...this._value.rules,next];
     this._editId=null;
     this.change({...this._value,rules});
    }catch(err){errorMessage.textContent=err.message||"Configuration invalide."}
   });
   section.append(form);content.append(section);
  }else content.append(el("p","hint","Maximum de cinq notifications atteint."));
  content.append(el("div","footer",
   "LINK distribue ces alertes. Les contenus sensibles restent masqués par défaut."));
  panel.append(content);root.append(panel);
 }
}
if(typeof customElements!=="undefined"&&!customElements.get("link-notify-picker"))
 customElements.define("link-notify-picker",LinkNotifyPicker);
