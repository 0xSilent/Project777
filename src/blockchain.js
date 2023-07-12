/*
  Connection to Stargaze 
  Using webpack cosmjs 
*/
import '../lib/cosmjs-stargate.min.js';
const {SigningStargateClient, StargateClient, CosmWasmClient, Tx} = cosmjs
const chainId = "stargaze-1";
let client, cwclient;

//basic function to pull tx that are to/from an account
const getTxToOrFrom = async(address,ToOrFrom = "from")=>{
  const search = await client.searchTx({
    sentFromOrTo: address
  })
  let res = []

  //use for each to reduce cycle time through 
  search.forEach(({hash, height, rawLog, tx})=>{
    const events = JSON.parse(rawLog)[0].events
    //reduce the events looking for a transfer 
    const {sender, recipient, amount} = events.reduce((_tfr,e)=>{
      if (_tfr.sender != "" || e.type != "transfer")
        return _tfr;

      //map attributes.value [sender address, recipient address, # stars] to _tfr 
      e.attributes.forEach(a=>_tfr[a.key] = a.value)
      return _tfr
    }
    , {
      sender: "",
      recipient: "",
      amount: 0
    })
    //check for amt and address
    if (amount == 0 || address != (ToOrFrom == "from" ? sender : recipient))
      return;

    //decode raw tx
    const decoded = Tx.decode(tx)

    let data = {
      hash,
      height,
      sender,
      recipient,
      amount,
      memo: decoded.body.memo
    }

    res.push(data)
  }
  )

  console.log(res)
}

const sendTx = (data) => {
  let recipient = "stars1r968tyzcnz2lju05txmhftnvap49ursfgpz85s";
  let amount = 3;

  amount = parseFloat(amount);
  if (isNaN(amount)) {
    alert("Invalid amount");
    return false;
  }

  amount *= 1000000;
  amount = Math.floor(amount);

  (async () => {
    // See above.
    await window.keplr.enable(chainId);
    const offlineSigner = window.keplr.getOfflineSigner(chainId);
    const accounts = await offlineSigner.getAccounts();

    const client = await SigningStargateClient.connectWithSigner(
      rpc,
      offlineSigner
    );

    const amountFinal = {
      denom: "ustars",
      amount: amount.toString(),
    };
    const fee = {
      amount: [
        {
          denom: "ustars",
          amount: "5000",
        },
      ],
      gas: "200000",
    };

    const result = await client.sendTokens(
      accounts[0].address,
      recipient,
      [amountFinal],
      fee,
      "ABCDE12345"
    );
    //assertIsBroadcastTxSuccess(result);

    if (result.code !== undefined && result.code !== 0) {
      alert("Failed to send tx: " + result.log || result.rawLog);
    } else {
      alert("Succeed to send tx:" + result.transactionHash);
    }
  })();

  return false;
};

/*
  Query Data from Constellations
*/

const getTokensByAddress = async (address,isMain=true)=>{
  const main = "stars19vgvlu5jw4ne2aang6fnwg8ul8wlqcdmht3h2m87rtqel3ztgxcqsh0aa3"
  const test = "stars1gdf8ud465e9khy590fmtxcywxcydwzec5ecf84gc7vcgytphla3qlntuhc"

  const query = {
    tokens : {
      owner : address
    }
  }
  
  return await cwclient.queryContractSmart(isMain ? main : test, query)
}

//testnet / mainnet 
const NFT = {
  count : [3,777],
  img : ["https://bafybeiatxfo52ynuvrsezfztphdqfj3bnnjrxxf75jzbeija5cmyux64im.ipfs.nftstorage.link/","https://nftstorage.link/ipfs/bafybeiec7wvovufcr5ul4edrghgjvlwmra52t7km5cex356pitddqnsvzy/"],
  json : ["https://bafybeid2k2e5qn3rydmaa4af3n5iqbtfm4iosfe35hddcvviw5sujsrl2m.ipfs.nftstorage.link/","https://nftstorage.link/ipfs/bafybeidi5sdbptoo7ltq3zxqg3rkqzyqzful6rzsmnfmlw7mpm43y6kw34/"]
}

const getJSON = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        resolve(xhr.response);
      } else {
        reject(status);
      }
    };
    xhr.send();
  });
};

const tokenData = async (id, isMain) => {  
  let idx = isMain ? 1 : 0

  let data = await getJSON(NFT.json[idx]+id)
  data.image = NFT.img[idx]+id+".jpeg"

  const attributes = Object.fromEntries(data.attributes.map(a => [a.trait_type,a.value]))
  data.attributes = attributes
  
  return data
}

const connect = async (app,isMain = true) => {
  const main = "https://rpc.stargaze-apis.com/"
  const test = "https://rpc.elgafar-1.stargaze-apis.com"
  //connect to Stargaze 
  client = await StargateClient.connect(isMain ? main : test)
  cwclient = await CosmWasmClient.connect(isMain ? main : test)

  //chain id 
  const chainId = await cwclient.getChainId()
  console.log("Chain: ", chainId)

  //connect to keplr
  await window.keplr.enable(chainId);
  const offlineSigner = window.keplr.getOfflineSigner(chainId);
  const accounts = await offlineSigner.getAccounts();

  //address 
  app.setState({ account: accounts[0].address });

  //tokens 
  let tokens = await getTokensByAddress(accounts[0].address,isMain)
  app.setState({tokens:tokens.tokens})

  const tData = app.state.tData
  tokens.tokens.forEach(async id => {
    //check if data exists
    if(!Object.keys(tData).includes(id)) {
      //if data doesn't exist pull it 
      tData[id] = await tokenData(id,isMain)
      app.setState({tData})
    }
  })
}

export {tokenData, sendTx, connect}