const WebSocket = require('ws');
const enigma = require('enigma.js');
const schema = require('enigma.js/schemas/12.20.0.json');

const script = `
Characters:
Load Chr(RecNo()+Ord('A')-1) as Alpha, RecNo() as Num autogenerate 26;

ASCII:
Load
if(RecNo()>=65 and RecNo()<=90,RecNo()-64) as Num,
  Chr(RecNo()) as AsciiAlpha,
RecNo() as AsciiNum
autogenerate 255
Where (RecNo()>=32 and RecNo()<=126) or RecNo()>=160 ;

Transactions:
Load
TransLineID,
TransID,
mod(TransID,26)+1 as Num,
Pick(Ceil(3*Rand1),'A','B','C') as Dim1,
Pick(Ceil(6*Rand1),'a','b','c','d','e','f') as Dim2,
Pick(Ceil(3*Rand()),'X','Y','Z') as Dim3,
Round(1000*Rand()*Rand()*Rand1) as Expression1,
Round(  10*Rand()*Rand()*Rand1) as Expression2,
Round(Rand()*Rand1,0.00001) as Expression3;
Load
Rand() as Rand1,
IterNo() as TransLineID,
RecNo() as TransID
Autogenerate 1000
While Rand()<=0.5 or IterNo()=1;

Comment Field Dim1 With "This is a field comment";
`;

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(); }, ms);
  });
}

describe('QIX doc sync - reload doc', () => {
  let engine1;
  let engine2;

  before(() => {
    if (!process.env.ENGINE1 || !process.env.ENGINE2) {
      console.log('Please specify engines to use for the test. Check README for instructions.');
      process.exit(1);
    }
    // Remove protocol from url if included
    engine1 = process.env.ENGINE1.replace(/^(http[s]?:\/\/)/, '');
    engine2 = process.env.ENGINE2.replace(/^(http[s]?:\/\/)/, '');
    console.log(`Using engines ${engine1} and ${engine2} in test`);
  });

  it('should be possible to create a doc in one engine and reload in another', async () => {
    // Open a session to first engine and create an app
    console.log('Opening a session to first qix-engine');
    const session1 = enigma.create({
      schema,
      url: `ws://${engine1}/app/engineData/identity/${+new Date()}`,
      createSocket: url => new WebSocket(url),
    });

    session1.on("traffic:*", (direction, data) => console.log("session1", direction, JSON.stringify(data)));

    const qix1 = await session1.open();
    console.log('Creating doc in first qix-engine instance');
    const result = await qix1.createApp(`testApp${+new Date()}`);
    expect(result.qSuccess).to.equal(true);
    console.log(`Created doc with id: ${result.qAppId}`);
    const appId = result.qAppId;

    // Open doc and save the reload time
    const app = await qix1.openDoc(appId);
    const appLayout = await app.getAppLayout();
    await app.doSave();
    await sleep(1000);
    console.log(`Doc after create has last reload time: ${appLayout.qLastReloadTime}`);

    // Set up subscription on changed, suspend and closed events
    app.on('changed', async () => {
      console.log('Received changed event on doc on first qix-engine instance');
    });

    app.on('suspend', async () => {
      console.log('Received suspend event on doc on first qix-engine instance');
    });

    app.on('closed', async () => {
      console.log('Received closed event on doc on first qix-engine instance');
    });

    // Open the document in second engine, set script and do reload
    console.log('Opening a session to second qix-engine and reloading doc');
    const session2 = enigma.create({
      schema,
      url: `ws://${engine2}/app/engineData/identity/${+new Date()}`,
      createSocket: url => new WebSocket(url),
    });
    session2.on("traffic:*", (direction, data) => console.log("session2", direction, JSON.stringify(data)));

    const qix2 = await session2.open();
    const app2 = await qix2.openDoc(appId);

    console.log('Setting a script, reloading doc and saving in second qix-engine instance');
    await app2.setScript(script);
    await app2.doReload(0, false, false);
    await app2.doSave();

    // Get and save new reload time
    const appLayout2 = await app2.getAppLayout();
    console.log(`Doc after reload has last reload time: ${appLayout2.qLastReloadTime}`);

    // Wait for the first instance to get an updated reload time
    let newReloadTime = appLayout.qLastReloadTime;

    let retries = 0;
    while (newReloadTime !== appLayout2.qLastReloadTime && retries < 10) {
      await sleep(2000);
      const tempLayout = await app.getAppLayout();
      newReloadTime = tempLayout.qLastReloadTime;
      console.log(`Doc has last reload time: ${newReloadTime}`);
      retries += 1;
    }

    // Wait for sessions to be closed
    await session1.close();
    await session2.close();

    // Verify that the reload time was updated in the first engine instance
    expect(newReloadTime).to.equal(appLayout2.qLastReloadTime);
  });
});
