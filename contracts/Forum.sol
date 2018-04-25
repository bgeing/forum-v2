pragma solidity ^0.4.18;
import "./ECRecovery.sol";

contract Forum {

    event LogMsg(address);

    function log(address message) internal {
        emit LogMsg(message);
    }

    using ECRecovery for bytes32;

    struct User {
        bool registered;
        string userName;
        string password;
        address userAddress;
        uint ownedTokens;
        bytes32[] questionsIdList;
        bytes32[] answersIdList;
        mapping (bytes32 => Question) myQuestions;
        mapping (bytes32 => Answer) myAnswers;
    }

    mapping (address => User) userInfo;

    struct Question {
        bytes32 id;
        string title;
        string question;
        address questioner;
        bytes32[] answersIdList;
        uint createDate;
        uint questionReward;
        bool bestAnswerSelected;
        mapping (bytes32 => Answer) answerInfo;
    }

    struct Answer {
        bytes32 id;
        string answer;
        address answerer;
        uint rewards;
        bool bestAnswer;
        uint createDate;
    }

    bytes32[] public questionIdList;
    mapping (bytes32 => Question) public questionInfo;
    
    uint public totalTokens; // Total no. of tokens available for this website
    uint public balanceTokens; // Total no. of tokens still available for purchase
    uint public tokenPrice; // Price per token

    struct QuestionMessage {
        string title;
        string content;
        uint reward;
    }

    mapping (bytes32 => QuestionMessage) public messageQueue;

    modifier isTokenEnough() {
        uint tokensToBuy = msg.value / tokenPrice;
        require(tokensToBuy <= balanceTokens);
        _;
    }

    function Forum(uint tokens, uint pricePerToken) public {
        totalTokens = tokens;
        balanceTokens = tokens;
        tokenPrice = pricePerToken;
        questionIdList = new bytes32[](0);
    }
/*
    function askQuestion(string questionTitle, string questionContent, uint reward) public returns (bytes32){
        bytes32 questionId = sha256(now);
        require(reward <= userInfo[msg.sender].ownedTokens);
        Question memory question = Question(questionId, questionTitle, questionContent, msg.sender, new bytes32[](0), now, reward, false);
        questionInfo[questionId] = question;
        questionIdList.push(questionId);
        userInfo[msg.sender].userAddress = msg.sender;
        userInfo[msg.sender].questionsIdList.push(questionId);
        userInfo[msg.sender].myQuestions[questionId] = question;
        userInfo[msg.sender].ownedTokens -= reward;

        return questionId;
    }
*/
    function getQuestionListLength() view public returns (uint) {
        return questionIdList.length;
    }

    //return value : questionId, questionTitle, questionContent, username, questioner, createDate, questionReward, bestAnswerSelected
    function getQuestion (uint questionIndex) view public returns (bytes32, string, string, string, address, uint, uint, bool) {
        bytes32 questionId = questionIdList[questionIndex];
        Question memory question = questionInfo[questionId];
        return (question.id, question.title, question.question, userInfo[question.questioner].userName, question.questioner, question.createDate, question.questionReward, question.bestAnswerSelected);
    }

    function getQuestionAnswerListLength(uint questionIndex) view public returns (uint) {
        bytes32 questionId = questionIdList[questionIndex];
        return questionInfo[questionId].answersIdList.length;
    }

    function getQuestionAnswerListLengthByQuestionId(bytes32 questionId) view public returns (uint) {
        return questionInfo[questionId].answersIdList.length;
    }

    function getQuestionAnswerByQuestionId(bytes32 questionId, uint answerIndex)  view public returns (string, bytes32, bytes32, address, bool, uint) {
        bytes32 answerId = questionInfo[questionId].answersIdList[answerIndex];
        address answerer = questionInfo[questionId].answerInfo[answerId].answerer;
        // string userName = userInfo[questionInfo[questionId].answerInfo[answerId].answerer].userName;
        string memory answerContent = questionInfo[questionId].answerInfo[answerId].answer;
        bool isBestAnswer = questionInfo[questionId].answerInfo[answerId].bestAnswer;
        uint createDate = questionInfo[questionId].answerInfo[answerId].createDate;
        return (answerContent, answerId, questionId, answerer, isBestAnswer, createDate);
    }

    function getQuestionAnswer(uint questionIndex, uint answerIndex) view public returns (string, bytes32, bytes32, address, bool, uint) {
        bytes32 questionId = questionIdList[questionIndex];
        bytes32 answerId = questionInfo[questionId].answersIdList[answerIndex];
        address answerer = questionInfo[questionId].answerInfo[answerId].answerer;
        string memory answerContent = questionInfo[questionId].answerInfo[answerId].answer;
        bool isBestAnswer = questionInfo[questionId].answerInfo[answerId].bestAnswer;
        uint createDate = questionInfo[questionId].answerInfo[answerId].createDate;
        return (answerContent, answerId, questionId, answerer, isBestAnswer, createDate);
    }

    function answerQuestion(bytes32 questionId, string answerContent) public {
        bytes32 answerId = sha256(now);
        // Question question = questionInfo[questionId];
        Answer memory answer = Answer(answerId, answerContent, msg.sender, 0, false, now);
        questionInfo[questionId].answersIdList.push(answerId);
        questionInfo[questionId].answerInfo[answerId] = answer;
        userInfo[msg.sender].userAddress = msg.sender;
        userInfo[msg.sender].answersIdList.push(answerId);
        userInfo[msg.sender].myAnswers[answerId] = answer;
    }

    function saveMessageToQueue(bytes32 message, string title, string content, uint reward) public {
        messageQueue[message].title = title;
        messageQueue[message].content = content;
        messageQueue[message].reward = reward;
    }

    function askQuestionWithoutGas(bytes32 message, bytes sign, address questioner) public {
        address recoveredAddress = message.recover(sign);

        log(recoveredAddress);

        //TODO: this require is needed for checking the public key get from recover(message, sign) == questionerAddress
        // require(recoveredAddress == questioner);
        bytes32 questionId = sha256(now);
        require(messageQueue[message].reward <= userInfo[questioner].ownedTokens);
        Question memory question = Question(questionId, messageQueue[message].title, messageQueue[message].content, questioner, new bytes32[](0), now, messageQueue[message].reward, false);
        questionInfo[questionId] = question;
        questionIdList.push(questionId);
        userInfo[questioner].userAddress = questioner;
        userInfo[questioner].questionsIdList.push(questionId);
        userInfo[questioner].myQuestions[questionId] = question;
        userInfo[questioner].ownedTokens -= messageQueue[message].reward;
    }

    // function getQuestionAnswers(bytes32 questionId) view public returns (Answer[]) {
    //     // Question question = questionInfo[questionId];
    //     Answer[] memory answerList = new Answer[](questionInfo[questionId].answersIdList.length);
        
    //     for (uint i = 0; i < questionInfo[questionId].answersIdList.length; i++) {
    //         Answer memory answerRes = questionInfo[questionId].answerInfo[questionInfo[questionId].answersIdList[i]];
    //         answerList[i] = answerRes;
    //     }
        
    //     return answerList;
    // }

    function setAsBestAnswer(bytes32 questionId, bytes32 answerId) public {
        questionInfo[questionId].answerInfo[answerId].bestAnswer = true;
        uint reward = questionInfo[questionId].questionReward;
        questionInfo[questionId].bestAnswerSelected = true;
        address answererAddress = questionInfo[questionId].answerInfo[answerId].answerer;
        userInfo[answererAddress].ownedTokens += reward;
    }

    function buy() isTokenEnough payable public {
        uint tokensToBuy = msg.value / tokenPrice;
        userInfo[msg.sender].userAddress = msg.sender;
        userInfo[msg.sender].ownedTokens += tokensToBuy;
        balanceTokens -= tokensToBuy;
    }

    function userDetails(address user) view public returns (uint) {
        return (userInfo[user].ownedTokens);
    }

    function tokensSold() view public returns (uint) {
        return totalTokens - balanceTokens;
    }

    function transferTo(address account) public {
        account.transfer(address(this).balance);
    }

    function registerUser(string userName, string password, address userAddress) public {
        if (userInfo[userAddress].registered) revert();
        userInfo[userAddress].registered = true;
        userInfo[userAddress].userName = userName;
        userInfo[userAddress].password = password;
        userInfo[userAddress].userAddress = userAddress;
        log(userAddress);
    }

    //return userName, ownedTokens, questionsLength, answersLength
    function loginUser(address userAddress, string password) view public returns (string, uint, uint, uint) {
        if (keccak256(userInfo[userAddress].password) != keccak256(password)) revert();
        User memory user = userInfo[userAddress];
        return (user.userName, user.ownedTokens, user.questionsIdList.length, user.answersIdList.length);
    }

    function getUserInfo(address userAddress) view public returns (string, uint, uint, uint) {
        User memory user = userInfo[userAddress];
        return (user.userName, user.ownedTokens, user.questionsIdList.length, user.answersIdList.length);
    }

    



/*
    function convertAnswerToString(bytes32 answerId, string answerContent, address answerer, uint rewards, bool bestAnswer, uint createDate) public returns (string) {
        string memory isBestAnswer;
        if (bestAnswer) {
            isBestAnswer = "true";
        } else {
            isBestAnswer = "false";
        }

        return strConcat(answerContent, answerer, rewards, isBestAnswer, createDate, "==>");
    }

    function strConcat(string _b, address _c, uint _d, string _e, uint _f, string _spliter) internal returns (string){
        // string memory str0 = strConcatSub0(bytes32ToString(_a));
        string memory str1 = strConcatSub1(_b, _c, _spliter);
        string memory str2 = strConcatSub2(_d, _e, _f, _spliter);
        // bytes memory _ba = bytes(str0);
        bytes memory _bb = bytes(str1);
        bytes memory _bc = bytes(str2);
        string memory abcde = new string(_bb.length + _bc.length);
        bytes memory babcde = bytes(abcde);
        uint k = 0;
        // for (uint i = 0; i < _ba.length; i++) babcde[k++] = _ba[i];
        for (uint i = 0; i < _bb.length; i++) babcde[k++] = _bb[i];
        for (i = 0; i < _bc.length; i++) babcde[k++] = _bc[i];
        return string(babcde);
    }

    function strConcatSub0(string[] id) internal returns (string) {
        // bytes memory _ba = bytes(id);
        // string memory newStr = new string(_ba.length);
        // bytes memory res = bytes(newStr);
        // uint k = 0;
        // for (uint i = 0; i < _ba.length; i++) res[k++] = _ba[i];
        // return string(res);
    }

    function strConcatSub1(string answerContent, address answerer, string spliter) internal returns (string) {
        bytes memory _bb = bytes(answerContent);
        bytes memory _bc = addressToBytes(answerer);
        bytes memory _spliter = bytes(spliter);
        string memory newStr = new string(_spliter.length + _bb.length + _spliter.length +_bc.length + _spliter.length);
        bytes memory res = bytes(newStr);
        uint k = 0;
        for (uint i = 0; i < _spliter.length; i++) res[k++] = _spliter[i];
        for (i = 0; i < _bb.length; i++) res[k++] = _bb[i];
        for (i = 0; i < _spliter.length; i++) res[k++] = _spliter[i];
        for (i = 0; i < _bc.length; i++) res[k++] = _bc[i];
        for (i = 0; i < _spliter.length; i++) res[k++] = _spliter[i];
        return string(res);
    }

    function strConcatSub2(uint rewards, string isBestAnswer, uint createDate, string spliter) internal returns (string) {
        bytes memory _ba = uintToBytes(rewards);
        bytes memory _bb = bytes(isBestAnswer);
        bytes memory _bc = uintToBytes(createDate);
        bytes memory _spliter = bytes(spliter);
        string memory newStr = new string(_ba.length + _spliter.length + _bb.length + _spliter.length +_bc.length);
        bytes memory res = bytes(newStr);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) res[k++] = _ba[i];
        for (i = 0; i < _spliter.length; i++) res[k++] = _spliter[i];
        for (i = 0; i < _bb.length; i++) res[k++] = _bb[i];
        for (i = 0; i < _spliter.length; i++) res[k++] = _spliter[i];
        for (i = 0; i < _bc.length; i++) res[k++] = _bc[i];
        return string(res);
    }

    function bytes32ToBytes(bytes32 data) view public returns (bytes) {
        uint i = 0;
        while (i < 32 && uint(data[i]) != 0) {
            ++i;
        }
        bytes memory result = new bytes(i);
        i = 0;
        while (i < 32 && data[i] != 0) {
            result[i] = data[i];
            ++i;
        }
        return result;
    }

    function addressToBytes(address x) view public returns (bytes b) {
        b = new bytes(20);
        for (uint i = 0; i < 20; i++)
            b[i] = byte(uint8(uint(x) / (2**(8*(19 - i)))));
    }

    function uintToBytes(uint256 x) view public returns (bytes b) {
        b = new bytes(32);
        for (uint i = 0; i < 32; i++) {
            b[i] = byte(uint8(x / (2**(8*(31 - i))))); 
        }
    }

    function bytes32ToString(bytes32 x) view public returns (string) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }
*/
}