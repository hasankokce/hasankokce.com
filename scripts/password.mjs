import {randomBytes,scryptSync} from 'node:crypto';
let password='';for await(const c of process.stdin)password+=c;password=password.trimEnd();if(password.length<14){console.error('En az 14 karakterli bir şifre gerekli. Şifreyi standart girdiden verin.');process.exit(1)}const salt=randomBytes(16).toString('hex');console.log(salt+':'+scryptSync(password,salt,64).toString('hex'));
