import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAssistantRequest} from '../api/assistant';
import {indianLanguages,isConversationEnd} from '../lib/indianLanguages';
test('all scheduled language codes and English validate for text answers',()=>{assert.equal(Object.keys(indianLanguages).length,23);for(const language of Object.keys(indianLanguages))assert.equal(parseAssistantRequest({message:'Hello',language}).language,language)});
test('standalone goodbyes end a session but thanks within a substantive question do not',()=>{for(const phrase of ['Thank you!','thanks a lot','ಧನ್ಯವಾದಗಳು','धन्यवाद','நன்றி'])assert.equal(isConversationEnd(phrase),true);for(const phrase of ['Thank you, but what is the deadline?','How do I thank you in Kannada?','My landlord said goodbye'])assert.equal(isConversationEnd(phrase),false)});
