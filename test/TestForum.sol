pragma solidity ^0.4.16;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Forum.sol";

contract TestForum {
    uint public initialBalance = 2 ether;

    function testInitialTokenBalanceUsingDeployedContract() public {
        Forum forum = Forum(DeployedAddresses.Forum());

        uint expected = 10000;
        
        Assert.equal(forum.balanceTokens(), expected, "10000 tokens not initialzed for sale");
    }

    function testBuyTokens() public {
        Forum forum = Forum(DeployedAddresses.Forum());
        forum.buy.value(0.0000001 ether)();
        Assert.equal(forum.balanceTokens(), 9999, "9999 tokens should have been available");
    }
}