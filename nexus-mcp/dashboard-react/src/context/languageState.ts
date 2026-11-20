import {createContext,useContext} from 'react'
export const LanguageContext=createContext({language:'en-IN',t:(text:string)=>text,choose:()=>{},loadLanguage:async(...args:string[]):Promise<Record<string,string>|null>=>{void args;return null}})
export const useLanguage=()=>useContext(LanguageContext)
