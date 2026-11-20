import Database from 'better-sqlite3';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class KioskIdentity {
  private db:Database.Database;
  private tap:{sequence:number;expires:number}|null=null;
  private unlocked:{lease:string;expires:number}|null=null;
  constructor(file:string){
    if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.db=new Database(file);
    this.db.exec('CREATE TABLE IF NOT EXISTS identity(id INTEGER PRIMARY KEY CHECK(id=1), card TEXT, salt TEXT NOT NULL, pin TEXT NOT NULL, failures INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0)');
    if(file!==':memory:'&&process.platform!=='win32')fs.chmodSync(file,0o600);
  }
  arm(pin:string){
    if(!/^\d{4,12}$/.test(pin))throw Error('Use 4–12 digits');
    if(this.row())throw Error('A card is already enrolled or enrollment is armed');
    const salt=randomBytes(16).toString('hex');
    this.db.prepare('INSERT INTO identity(id,salt,pin) VALUES(1,?,?)').run(salt,scryptSync(pin,salt,32).toString('hex'));
  }
  private row(){return this.db.prepare('SELECT * FROM identity WHERE id=1').get() as {card:string|null;salt:string;pin:string;failures:number;blocked:number}|undefined;}
  status(){const row=this.row();return {enabled:!!row,enrolled:!!row?.card};}
  card(uid:string,sequence:number,now=Date.now()){
    this.unlocked=null;this.tap=null;
    const row=this.row();if(!row)return {recognized:false,enrolled:false};
    const card=createHash('sha256').update(uid).digest('hex');
    if(!row.card)this.db.prepare('UPDATE identity SET card=? WHERE id=1 AND card IS NULL').run(card);
    const recognized=!row.card||row.card===card;
    if(recognized)this.tap={sequence,expires:now+60000};
    return {recognized,enrolled:!row.card};
  }
  unlock(pin:unknown,sequence:unknown,lease:string,now=Date.now()){
    const row=this.row();
    if(!row?.card||!this.tap||this.tap.expires<now||this.tap.sequence!==sequence)throw Error('Tap the enrolled card again.');
    if(row.blocked>now)throw Error('Too many attempts. Wait five minutes before trying again.');
    if(typeof pin!=='string'||!/^\d{4,12}$/.test(pin))throw Error('Enter your PIN using digits.');
    const valid=timingSafeEqual(scryptSync(pin,row.salt,32),Buffer.from(row.pin,'hex'));
    if(!valid){const failures=row.failures+1;this.db.prepare('UPDATE identity SET failures=?,blocked=? WHERE id=1').run(failures,failures>=5?now+300000:0);throw Error('Incorrect PIN.');}
    this.db.prepare('UPDATE identity SET failures=0,blocked=0 WHERE id=1').run();
    this.tap=null;this.unlocked={lease,expires:now+300000};return {authenticated:true,expiresAt:this.unlocked.expires};
  }
  authenticated(lease:string,now=Date.now()){return !!this.unlocked&&this.unlocked.lease===lease&&this.unlocked.expires>now;}
  lock(){this.unlocked=null;this.tap=null;}
  close(){this.db.close();}
}
let identity:KioskIdentity|undefined;
export function kioskIdentity(){return identity??=new KioskIdentity(process.env.KIOSK_IDENTITY_DB||path.join(process.cwd(),'data/private/kiosk-identity.sqlite'));}
