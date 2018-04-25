// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';
import { default as ethUtil} from 'ethereumjs-util';
import { default as sigUtil} from 'eth-sig-util';
import { default as ipfsAPI} from 'ipfs-api';

import forum_artifacts from '../../build/contracts/Forum.json';

var Forum = contract(forum_artifacts);

let tokenPrice = null;

var ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});

$(document).ready(function() {

  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source like Metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
  console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
  // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  ipfs.swarm.peers(function(err, response) {
    if (err) {
        console.error(err);
    } else {
        console.log("IPFS - connected to " + response.length + " peers");
        console.log(response);
    }
  });

  Forum.setProvider(web3.currentProvider);

  // Forum.deployed().then(contractInstance => {
  //   var event = contractInstance.LogMsg();
  //   event.watch(function(err, result) {
  //     if (err) {
  //       console.log(err)
  //       return;
  //     }
  //     console.log("!!!!!" + JSON.stringify(result));
  //   })
  // });

  initUser();
  populateTokenData();
  initQuestions();
  // addFile();
  getFile();
});

function initUser() {
  let userName = $.cookie("userName");
  let userAddress = $.cookie("address");

  if (userName != null) {
    $("#login-container").hide();
    $("#register-container").hide();
    
    Forum.deployed().then(contractInstance => {
      return contractInstance.getUserInfo.call(userAddress);
    }).then((res) => {
      let userName = res[0];
      let ownedTokens = Number(res[1]);
      let questionsLength = Number(res[2]);
      let answersLength = Number(res[3]);

      $("#user-avatar").append('<img src="http://eightbitavatar.herokuapp.com/?id=' + userAddress + '&s=male&size=400" style="width: 30px; height: 30px;"/><span style="font-size: 20px; font-weight: 600; margin-left: 10px;">'+userName+'</span>');
      $("#user-owned-tokens").html("Owned Tokens:  " + ownedTokens);
      $("#user-questions-number").html("Questions number:  " + questionsLength);
      $("#user-answers-number").html("Answers number:  " + answersLength);

      $("#user-info-container").show();  
      $("#buy-tokens-container").show();
      $("#ask-question-container").show();
    });
  } else {
    $("#user-info-container").hide();
    $("#login-container").show();
  }
  
}

window.buyTokens = function() {
  let tokensToBuy = $("#buy").val();
  let price = tokensToBuy * tokenPrice;
  let accountAddress = $.cookie("address");
  
  $("#buy-msg").html("Purchase order has been submitted. Please wait.");
  Forum.deployed().then(function(contractInstance) {
    contractInstance.buy({value: web3.toWei(price, 'ether'), from: accountAddress}).then(function(v) {
      $("#buy-msg").html("");
      web3.eth.getBalance(contractInstance.address, function(error, result) {
        $("#contract-balance").html(web3.fromWei(result.toString()) + " Ether");
      });
    })
  });
  populateTokenData();
}

window.lookupUserInfo = function() {
  let address = $("#user-info").val();
  Forum.deployed().then(function(contractInstance) {
    contractInstance.userDetails.call(address).then(function(val) {
      $("#tokens-bought").html("Owned Tokens: " + val.toString());
    });
  });
}

window.toggleLoginBox = function() {
  if ($("#login-container").is(":hidden")) {
    $("#register-container").hide();
    $("#login-container").show();
  } else {
    $("#login-container").hide();
    $("#register-container").show();
  }
}

window.register = function() {
  let address = $("#user-register-address").val();
  let userName = $("#user-register-username").val();
  let password = $("#user-register-password").val();

  Forum.deployed().then(contractInstance => {
    contractInstance.registerUser(userName, password, address, {gas: 1000000, from: address}).then((val) => {
      console.log(val);
    });
  });
}

window.login = function() {
  let address = $("#user-login-address").val();
  let password = $("#user-login-password").val();

  Forum.deployed().then(contractInstance => {
      return contractInstance.loginUser.call(address, password);
  }).then((res) => {
    let userName = res[0];
    let ownedTokens = res[1];
    let questionsLength = res[2];
    let answersLength = res[3];
    console.log(userName + " login success");

    $.cookie('userName', userName);
    $.cookie('address', address);
  });
}

window.ask = function() {
  let questionTitle = $("#question-title").val();
  let questionContent = $("#question-content").val();
  let reward = Number($("#question-reward").val());
  let questioner = $.cookie("address");

  Forum.deployed().then(function(contractInstance) {
    contractInstance.askQuestion(questionTitle, questionContent, reward, {gas: 1000000, from: questioner}).then(function(val) {
      if (val.receipt.status == "0x1") {
        alert("Success");
      } else {
        alert("Warning: transaction not success");
      }
    }).catch(err => {
      console.log(err);
    })
  })
}

window.askQuestionWithoutGas = function() {
  let questionTitle = $("#question-title").val();
  let questionContent = $("#question-content").val();
  let reward = Number($("#question-reward").val());
  let questioner = $.cookie("address");

  let message = questionTitle + "==>" + questionContent + "==>" + reward;

  Forum.deployed().then(function(contractInstance) {
    return contractInstance.saveMessageToQueue(message, questionTitle, questionContent, reward, {gas: 1000000, from: web3.eth.accounts[0]});
  }).then(() => {
    console.log("before sign");
    let msgParams = [
      {
        type: 'string',      // Any valid solidity type
        name: 'Message',     // Any string label you want
        value: message  // The value to sign
      }
    ];
  
    var from = $.cookie("address");
    // var from = web3.eth.accounts[0];
  
    var params = [msgParams, from];
    var method = 'eth_signTypedData';
  
    // return Promise.resolve(web3.currentProvider.sendAsync({
    //   id: new Date().getTime(),
    //   method: method,
    //   params: params,
    //   from: from
    // }));
    web3.currentProvider.sendAsync({
      // id: new Date().getTime(),
      method: method,
      params: params,
      from: from
    }, function (err, result) {
      if (err) return console.dir(err)
      if (result.error) {
        alert(result.error.message)
      }
      if (result.error) return console.error(result)
      
      console.log('PERSONAL SIGNED:' + JSON.stringify(result.result));
      // return result.result;
      Forum.deployed().then(function(contractInstance) {
        contractInstance.askQuestionWithoutGas(message, result.result, from, {gas: 2000000, from: web3.eth.accounts[0]})
          .then(val => {
            console.log(JSON.stringify(val, null ,4));
          });
      })
      
    })
  })
  // .then(result => {
  //   console.log("-=-=-===");
  //   let sign = result.result;
  //   console.log("Personal signed : " + sign);
  //   return sign;
  // }).then((sign) => {
  //   return contractInstance.askQuestionWithoutGas(message, sign, from, {gas: 1000000, from: web3.eth.accounts[0]});
  // }).then((val) => {
  //   console.log(JSON.stringify(val, null ,4));
  // })
}

window.answer = function(event) {
  let answerContent = $(event).prev().find(".myAnswerContent").val();
  let answerer = $.cookie("address");
  let questionId = $(event).parent().parent().parent().attr("id");

  Forum.deployed().then(function(contractInstance) {
    contractInstance.answerQuestion(questionId, answerContent, {gas: 1000000, from: answerer}).then(function(val){
      
      if (val.receipt.status == "0x1") {
        alert("Answer Success");
      } else {
        alert("Warning: transaction not success");
      }

    })
  });

}

function getQuestionListLength() {
  return Forum.deployed()
    .then(contractInstance => {
      return contractInstance.getQuestionListLength.call();
    });
}

function initQuestions() {
  Promise.resolve(getQuestionListLength())
    .then(length => {
      let promArr = [];
      for (let i = 0; i < length; i++) {
        promArr.push(getQuestion(i));
      }

      Promise.all(promArr)
        .then(questionList => {
          for (let i = 0; i < questionList.length; i++) {
            let questionId = questionList[i][0];
            let questionTitle = questionList[i][1];
            let questionContent = questionList[i][2];
            let userName = questionList[i][3];
            let questioner = questionList[i][4];
            let createDate = questionList[i][5];
            let reward = questionList[i][6];
            let bestAnswerSelected = questionList[i][7];

            let questionArticleHtml = 
            '<div id="'+ questionId +'" questioner="'+ questioner +'" class="post">' +
              '<div class="post-head">'+
                '<h1 class="post-title">'+ questionTitle +'</h1>'+
                '<div class="post-meta">'+                    
                    '<span class="author"><img src="http://eightbitavatar.herokuapp.com/?id=' + questioner + '&s=male&size=400" style="width: 25px; height: 25px;"/><a style="margin-left: 5px;">'+ userName +'</a></span>'+
                    '<time class="post-date">'+
                      convertDate(createDate)+
                    '</time>'+
                '</div>'+
              '</div>'+
              '<div class="post-content">'+
                '<p>'+ questionContent +'</p>'+
              '</div>'+
              '<div style="display: flex;">'+
                '<div class="reward-container" style="width: 60px; background-color: #eee; border-radius: 5px;text-align: center;">'+
                // '<i class="fa fa-btc" aria-hidden="true" style="color: #e67e22; font-size: 1.5em"></i>'+
                  '<img src="https://res.cloudinary.com/erketang/image/upload/c_scale,w_15/v1524640880/coin2_iofvpi.png" style="margin-top: -5px; opacity: 0.9;"/>'+
                  '<span style="font-size: 18px;margin-left: 5px;">'+ reward +'</span>'+
                '</div>'+
                '<div class="expand-answer-btn" onclick="expandAnswerList(this, '+bestAnswerSelected+')" style="margin-left: 20px; cursor: pointer;">'+
                  '<i class="fa fa-comment" aria-hidden="true"></i>'+
                  '<span style="margin-left: 3px;">Answers</span>'+
                '</div>'+
              '</div>'+
              '<div class="answers-container" style="display: none; border: 1px solid #eee; border-radius: 5px; margin-top: 10px;">'+
                '<div class="answers-list">'+
                 
                '</div>'+
                '<div class="insert-answer" style="padding: 20px 20px 20px 20px;">'+
                  '<div style="display: flex;">'+
                    '<span class="author" style="col-sm-2"><img src="http://eightbitavatar.herokuapp.com/?id=' + $.cookie("address") + '&s=male&size=400" style="width: 35px; height: 35px;"/></span>'+
                    '<textarea type="text" class="myAnswerContent col-sm-10" style="margin-left: 20px;"></textarea>'+
                  '</div>'+
                  '<button class="btn btn-primary" style="margin-top: 10px; margin-left: 55px;" onclick="answer(this)">回复</button>'+
                '</div>'+
              '</div>'+
            '</div>';

            $("#question-list").append(questionArticleHtml);
          }
        });
    })
}

function getQuestion(index) {
  return Forum.deployed()
    .then(contractInstance => {
      return contractInstance.getQuestion.call(index);
    })
    .then(question => {
      $("#question-id").html(question[0]);
      $("#question").html(question[1]);
      return question;
    });
}

function getAnswer(questionIndex, answerIndex) {
  return Forum.deployed()
    .then(contractInstance => {
      return contractInstance.getQuestionAnswer.call(questionIndex, answerIndex);
    });
}

function getQuestionAnswerByQuestionId(questionId, answerIndex) {
  return Forum.deployed()
    .then(contractInstance => {
      return contractInstance.getQuestionAnswerByQuestionId.call(questionId, answerIndex);
    });
}

function getAnswerListLength(questionIndex) {
  return Forum.deployed()
    .then((contractInstance) => {
      return contractInstance.getQuestionAnswerListLength.call(questionIndex);
    })
}

function getAnswerContent(index) {
  Forum.deployed().then(function(contractInstance){
    contractInstance.getQuestionAnswer.call(index).then(function(val) {
      $("#answer").html(val[0]);
      $("#answer-id").html(val[1]);
      $("#question-id-1").html(val[2]);
    })
  })
}

function populateTokenData() {
  Forum.deployed().then(function(contractInstance) {
    contractInstance.totalTokens().then(function(v) {
      $("#tokens-total").html(v.toString());
    });
    contractInstance.tokensSold.call().then(function(v) {
      $("#tokens-sold").html(v.toString());
    });
    contractInstance.tokenPrice().then(function(v) {
      tokenPrice = parseFloat(web3.fromWei(v.toString()));
      $("#token-cost").html(tokenPrice + " Ether");
    });
    console.log("contract address :: " + contractInstance.address);
    web3.eth.getBalance(contractInstance.address, function(error, result) {
      $("#contract-balance").html(web3.fromWei(result.toString()) + " Ether");
    });
  });
}

window.setAsBestAnswer = function(event) {
  let questionId = $(event).attr("questionId");
  let answerId = $(event).attr("answerId");

  Forum.deployed().then(function(contractInstance) {
    contractInstance.setAsBestAnswer(questionId, answerId, {gas: 1000000, from: web3.eth.accounts[0]}).then(function(transactionInfo){
      alert("set best answer success");
      console.log(transactionInfo);
    });
  });
}

window.expandAnswerList = function(event, bestAnswerSelected) {
  let questionId = $(event).parent().parent().attr("id");
  if (!$(event).parent().next().is(":hidden")) {
    $(event).parent().next().find(".answers-list").empty();
    $(event).parent().next().slideToggle();
  } else {
    Forum.deployed()
      .then(function(contractInstance) {
        return contractInstance.getQuestionAnswerListLengthByQuestionId.call(questionId);
      })
      .then((answerListLength) => {
        let answerPromArr = [];
        for (let i = 0; i < answerListLength; i++) {
          answerPromArr.push(getQuestionAnswerByQuestionId(questionId, i));
        }

        Promise.all(answerPromArr)
          .then(answers => {
            for (let k = 0; k < answers.length; k++) {
              let answerContent = answers[k][0];
              let answerId = answers[k][1];
              let questionId = answers[k][2];
              let answerer = answers[k][3];
              let isBestAnswer = answers[k][4];
              let createDate = answers[k][5];
              console.log(questionId);

              let answerRowHtml = 
              '<div style="margin: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">'+
                '<div class="post-meta" style="display: flex; justify-content: space-between;">'+                    
                    '<div>'+
                      '<span class="author"><img src="http://eightbitavatar.herokuapp.com/?id=' + answerer + '&s=male&size=400" style="width: 25px; height: 25px;"/></span>'+
                      '<time class="post-date">'+
                        convertDate(createDate)+
                      '</time>'+
                    '</div>';
              
              if (!bestAnswerSelected) {
                if ($("#"+questionId).attr("questioner") == $.cookie("address")) {
                  answerRowHtml +=    
                    '<div>'+
                      '<button class="btn btn-primary" onclick="setAsBestAnswer(this)" questionId="'+questionId+'" answerId="'+answerId+'">Best</button>'+
                    '</div>';
                }
              } else {
                if (isBestAnswer) {
                  answerRowHtml +=    
                    '<div>'+
                      '<i class="fa fa-star" aria-hidden="true" style="color: #e67e22; font-size: 1.2em"></i>'+
                      '<span style="color: #e67e22;">Best Answer</span>'+
                    '</div>';
                }
              }
              
              answerRowHtml += 
                '</div>'+
                  '<div id="'+ answerId +'">'+ answerContent +'<div>'+
                '<div>';
  
              $(event).parent().next().find(".answers-list").append(answerRowHtml);
            }

            $(event).parent().next().slideToggle();
          });
      });
  }
}

function convertDate(unixTimeStamp) {
  let date = new Date(unixTimeStamp * 1000);
  let dateStr = date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate();
  return dateStr;
}

function addFile() {
  let txtBuffer = Buffer("What is thsi?  ??");
  const files = [
    {
      path: '/tmp/test.txt',
      content: (txtBuffer)
    }
  ]

  ipfs.files.add(files)
    .then(res => {
      console.log(JSON.stringify(res, null, 4));
    }).catch(err => {
      console.log(err);
    })
  
  // ipfs.files.add(files, function (err, files) {
  //   // 'files' will be an array of objects containing paths and the multihashes of the files added
  //   console.log(JSON.stringify(files, null ,4));
  // })
}

function getFile() {
  let validCID = 'QmfBzsC6cX7icpCh2SCGVHs8odwwqkwSjVS1H75NJY1shd';

  ipfs.files.get(validCID)
    .then(files => {
      files.forEach(file => {
        console.log(file.path);
        console.log(file.content.toString('utf8'));
      })
    })
    .catch(err => {
      console.log(err);
    })

  // ipfs.files.get(validCID, function (err, files) {
  //   files.forEach((file) => {
  //     console.log(file.path);
  //     console.log(file.content.toString('utf8'));
  //   })
  // })
}