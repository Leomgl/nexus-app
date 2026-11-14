import test,{after} from "node:test";
import assert from "node:assert/strict";
import {NOTIFICATION_SCHEDULE_SCHEMA} from "../link-notifications/notification-schedule-config.mjs";

/**
 * Lightweight DOM harness: exercises actual picker code without shipping
 * browser mocks to production or requiring a new npm dependency.
 */
class NodeStub{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};
  this.value="";this.textContent="";this.checked=false;this.style={}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes]}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 fire(k,extra={}){
  for(const fn of this.listeners[k]||[])fn({preventDefault(){},target:this,...extra});
 }
}
const previous={
 HTMLElement:globalThis.HTMLElement,
 customElements:globalThis.customElements,
 document:globalThis.document,
 CustomEvent:globalThis.CustomEvent
};
globalThis.HTMLElement=class{
 constructor(){this.shadowRoot=null;this.isConnected=false;this.events=[]}
 attachShadow(){this.shadowRoot=new NodeStub("shadow");return this.shadowRoot}
 dispatchEvent(event){this.events.push(event);return true}
};
globalThis.document={createElement:tag=>new NodeStub(tag)};
const registry=new Map();
globalThis.customElements={get:id=>registry.get(id),define:(id,type)=>registry.set(id,type)};
globalThis.CustomEvent=class{constructor(type,options){this.type=type;Object.assign(this,options)}};
const {LinkNotifyPicker}=await import("../link-notifications/notification-schedule-picker.mjs");
const all=node=>[node,...node.children.flatMap(all)];
const find=(picker,predicate)=>all(picker.shadowRoot).find(predicate);
const create=()=>{
 const picker=new LinkNotifyPicker();
 picker.isConnected=true;picker.render();
 return picker;
};

test("shared picker registers one component, starts disabled, and emits pure schedule change",()=>{
 assert.equal(registry.get("link-notify-picker"),LinkNotifyPicker);
 const picker=create();
 assert.equal(picker.value.schema,NOTIFICATION_SCHEDULE_SCHEMA);
 assert.equal(picker.value.enabled,false);
 const toggle=find(picker,n=>n.tag==="input"&&n.type==="checkbox");
 toggle.checked=true;toggle.fire("change");
 assert.equal(picker.value.enabled,true);
 assert.equal(picker.events.length,1);
 assert.equal(picker.events[0].type,"link-notify-change");
 assert.deepEqual(Object.keys(picker.events[0].detail),["schedule"]);
});
test("add/edit/delete rules in the same editor without server requests",()=>{
 const picker=create();
 picker.eventAt="2026-11-16T12:00:00.000Z";
 const toggle=find(picker,n=>n.tag==="input"&&n.type==="checkbox");
 toggle.checked=true;toggle.fire("change");
 let amount=find(picker,n=>n.tag==="input"&&n.type==="number");
 amount.value="30";amount.fire("input");
 let form=find(picker,n=>n.tag==="form");
 form.fire("submit");
 assert.equal(picker.value.rules.length,1);
 assert.equal(picker.value.rules[0].value,30);
 const existingId=picker.value.rules[0].id;
 let modify=find(picker,n=>n.tag==="button"&&n.textContent==="Modifier");
 modify.fire("click");
 amount=find(picker,n=>n.tag==="input"&&n.type==="number");
 amount.value="45";amount.fire("input");
 form=find(picker,n=>n.tag==="form");form.fire("submit");
 assert.equal(picker.value.rules.length,1);
 assert.equal(picker.value.rules[0].value,45);
 assert.equal(picker.value.rules[0].id,existingId);
 const remove=find(picker,n=>n.tag==="button"&&n.textContent==="Retirer");
 remove.fire("click");
 assert.equal(picker.value.rules.length,0);
});
test("fixed calendar option produces a canonical UTC instant and retains rules when off",()=>{
 const picker=create();
 picker.eventAt="2027-01-20T13:00:00.000Z";
 const toggle=find(picker,n=>n.tag==="input"&&n.type==="checkbox");
 toggle.checked=true;toggle.fire("change");
 const mode=find(picker,n=>n.tag==="button"&&n.textContent==="Date et heure précises");
 mode.fire("click");
 let date=find(picker,n=>n.tag==="input"&&n.type==="date");
 let time=find(picker,n=>n.tag==="input"&&n.type==="time");
 date.value="2027-01-15";date.fire("change");
 time.value="10:45";time.fire("change");
 const form=find(picker,n=>n.tag==="form");
 form.fire("submit");
 assert.equal(picker.value.rules.length,1);
 assert.equal(picker.value.rules[0].kind,"fixed");
 assert.match(picker.value.rules[0].at,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
 const off=find(picker,n=>n.tag==="input"&&n.type==="checkbox");
 off.checked=false;off.fire("change");
 assert.equal(picker.value.enabled,false);
 assert.equal(picker.value.rules.length,1);
});
test("switching to relatives without eventAt cannot submit a relative rule",()=>{
 const picker=create();
 const on=find(picker,n=>n.tag==="input"&&n.type==="checkbox");
 on.checked=true;on.fire("change");
 assert.equal(find(picker,n=>n.tag==="button"&&n.type==="submit").disabled,true);
 assert.equal(picker.value.rules.length,0);
});
// These test-only globals belong to this file's worker and do not contaminate
// the actual browser component or other node:test files.
after(()=>{
 for(const [key,value] of Object.entries(previous))
  if(value===undefined)delete globalThis[key];else globalThis[key]=value;
});
