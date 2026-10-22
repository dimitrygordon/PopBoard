const p=require('/workspace/pb/tests/node_modules/puppeteer-core');
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage();await pg.setViewport({width:1600,height:400});
await pg.goto('file:///workspace/mech/tiles/preview.html');await new Promise(r=>setTimeout(r,process.argv[2]||600));
await pg.screenshot({path:'/workspace/mech/tiles/'+(process.argv[3]||'preview.png')});await b.close();})();
