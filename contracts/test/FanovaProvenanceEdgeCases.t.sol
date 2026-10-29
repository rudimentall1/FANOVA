// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FanovaProvenance } from "../src/FanovaProvenance.sol";

interface VmEdge {
    function prank(address msgSender) external;
}

contract FanovaProvenanceEdgeCasesTest {
    VmEdge private constant vm = VmEdge(address(uint160(uint256(keccak256("hevm cheat code")))));

    FanovaProvenance private provenance;
    address private constant CREATOR = address(0xA11CE);
    address private constant FAN = address(0xB0B);
    address private constant ATTACKER = address(0xBAD);

    bytes32 private constant SALT = keccak256("edge-story-salt");
    bytes32 private constant SOURCE_V1 = keccak256("edge-source-v1");
    bytes32 private constant SOURCE_V2 = keccak256("edge-source-v2");
    bytes32 private constant PERMISSIONS_V1 = keccak256("edge-permissions-v1");
    bytes32 private constant PERMISSIONS_V2 = keccak256("edge-permissions-v2");
    bytes32 private constant STORY_ID = keccak256(abi.encode(CREATOR, SALT));
    bytes32 private constant CONTRIBUTION_ID = keccak256("edge-contribution-id");
    bytes32 private constant CONTRIBUTION_HASH = keccak256("edge-contribution");

    function setUp() public {
        provenance = new FanovaProvenance();
        vm.prank(CREATOR);
        provenance.registerStoryVersion(STORY_ID, SALT, 1, SOURCE_V1, 2, PERMISSIONS_V1);
    }

    function testPermissionVersionCannotDecreaseEvenWhenHashIsUnchanged() public {
        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                STORY_ID,
                SALT,
                uint64(2),
                SOURCE_V2,
                uint64(1),
                PERMISSIONS_V1
            )
        );

        require(!success, "permission version decreased");
        require(provenance.getStory(STORY_ID).latestVersion == 1, "failed update changed latest version");
    }

    function testDifferentCreatorSaltCannotRegisterNextVersion() public {
        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                STORY_ID,
                keccak256("wrong-salt"),
                uint64(2),
                SOURCE_V2,
                uint64(2),
                PERMISSIONS_V1
            )
        );

        require(!success, "changed creator salt accepted");
        require(provenance.getStory(STORY_ID).latestVersion == 1, "failed update changed latest version");
    }

    function testContributionCannotReferenceUnknownStory() public {
        bytes32 unknownStoryId = keccak256("unknown-story");
        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                CONTRIBUTION_ID,
                unknownStoryId,
                uint64(1),
                uint64(1),
                PERMISSIONS_V1,
                CONTRIBUTION_HASH,
                true
            )
        );

        require(!success, "unknown story accepted");
        require(!provenance.getContribution(CONTRIBUTION_ID).exists, "failed submission mutated state");
    }

    function testZeroContributionIdIsRejected() public {
        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                bytes32(0),
                STORY_ID,
                uint64(1),
                uint64(2),
                PERMISSIONS_V1,
                CONTRIBUTION_HASH,
                true
            )
        );

        require(!success, "zero contribution ID accepted");
        require(!provenance.getContribution(bytes32(0)).exists, "failed submission mutated state");
    }

    function testZeroContributionHashIsRejected() public {
        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                CONTRIBUTION_ID,
                STORY_ID,
                uint64(1),
                uint64(2),
                PERMISSIONS_V1,
                bytes32(0),
                true
            )
        );

        require(!success, "zero contribution hash accepted");
        require(!provenance.getContribution(CONTRIBUTION_ID).exists, "failed submission mutated state");
    }

    function testStoryCreatorCannotDecideContributionForAnotherStory() public {
        bytes32 otherSalt = keccak256("other-story-salt");
        bytes32 otherStoryId = provenance.computeStoryId(ATTACKER, otherSalt);

        vm.prank(ATTACKER);
        provenance.registerStoryVersion(otherStoryId, otherSalt, 1, SOURCE_V1, 1, PERMISSIONS_V2);

        vm.prank(FAN);
        provenance.registerContribution(
            CONTRIBUTION_ID,
            STORY_ID,
            1,
            2,
            PERMISSIONS_V1,
            CONTRIBUTION_HASH,
            true
        );

        vm.prank(ATTACKER);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.decideContribution.selector,
                CONTRIBUTION_ID,
                true,
                bytes32("APPROVED")
            )
        );

        require(!success, "unrelated story creator decided contribution");
        require(!provenance.getContribution(CONTRIBUTION_ID).decided, "failed decision mutated state");
    }

    function testZeroSourceVersionIsRejected() public {
        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                STORY_ID,
                SALT,
                uint64(0),
                SOURCE_V2,
                uint64(2),
                PERMISSIONS_V1
            )
        );

        require(!success, "zero source version accepted");
        require(provenance.getStory(STORY_ID).latestVersion == 1, "failed update changed latest version");
    }
}
