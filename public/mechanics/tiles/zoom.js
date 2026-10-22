const p=require('/workspace/pb/tests/node_modules/puppeteer-core');
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage();await pg.setViewport({width:1600,height:400,deviceScaleFactor:2});
await pg.goto('file:///workspace/mech/tiles/preview.html');await new Promise(r=>setTimeout(r,600));
await pg.screenshot({path:'/tmp/z.png',clip:{x:0,y:80,width:800,height:240}});await b.close();})();
