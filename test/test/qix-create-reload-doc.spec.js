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

describe('QIX doc sync - reload doc', () => {
  let engine1;
  let engine2;

  before(() => {
    engine1 = process.env.ENGINE1.substring(7);
    engine2 = process.env.ENGINE2.substring(7);
    console.log(`Using engines ${engine1} and ${engine2} in test`);
  });

  it('should be possible to create a doc in one engine and reload in another', async () => {
    // Open a session to first engine and create an app
    console.log('Opening a session to first qix-engine');
    const session = enigma.create({
      schema,
      url: `ws://${engine1}/app/engineData/identity/${+new Date()}`,
      createSocket: url => new WebSocket(url),
    });

    const qix1 = await session.open();
    console.log('Creating doc');
    const result = await qix1.createApp('testApp');
    expect(result.qSuccess).to.equal(true);
    console.log(`Created doc with id: ${result.qAppId}`);
    const appId = result.qAppId;

    // Open doc and save the reload time
    let app = await qix1.openDoc(appId);
    let appLayout = await app.getAppLayout();
    const firstReloadTime = appLayout.qLastReloadTime;
    console.log(`Doc was reloaded last time: ${firstReloadTime}`);
    await session.close();
    console.log('Closed session to first qix-engine');

    // Open the document in second engine, set script and do reload
    console.log('Opening a session to second qix-engine and reloading doc');
    const session2 = enigma.create({
      schema,
      url: `ws://${engine2}/app/engineData/identity/${+new Date()}`,
      createSocket: url => new WebSocket(url),
    });

    const qix2 = await session2.open();
    app = await qix2.openDoc(appId);
    appLayout = await app.getAppLayout();
    const reloadTime = appLayout.qLastReloadTime;
    console.log(`Doc was reloaded last time: ${reloadTime}`);
    expect(reloadTime).to.equal(firstReloadTime);

    await app.setScript(script);
    await app.doReload(0, false, false);
    await app.doSave();

    appLayout = await app.getAppLayout();
    const newReloadTime = appLayout.qLastReloadTime;
    console.log(`Reload time after reload: ${newReloadTime}`);
    expect(newReloadTime).to.not.equal(firstReloadTime);
    await session2.close();
    console.log('Closed session to second qix-engine');

    // Open doc in first engine again and verify reload time
    console.log('Opening a session to first qix-engine and verifying reload time');
    const session3 = enigma.create({
      schema,
      url: `ws://${engine1}/app/engineData/identity/${+new Date()}`,
      createSocket: url => new WebSocket(url),
    });

    const qix3 = await session3.open();
    app = await qix3.openDoc(appId);
    appLayout = await app.getAppLayout();
    console.log(`Doc was reloaded last time: ${appLayout.qLastReloadTime}`);
    expect(appLayout.qLastReloadTime).to.equal(newReloadTime);
    await session3.close();
    console.log('Closed session to first qix-engine');
  });
});
