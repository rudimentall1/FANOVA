// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FanovaProvenance } from "../src/FanovaProvenance.sol";

interface Vm {
    function prank(address msgSender) external;
}

contract FanovaProvenanceTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    FanovaProvenance private provenance;

    address private constant CREATOR = address(0xA11CE);
    address private constant FAN = address(0xB0B);
    address private constant ATTACKER = address(0xBAD);

    bytes32 private constant STORY_ID = keccak256("story-1");
    bytes32 private constant SOURCE_HASH_V1 = keccak256("source-v1");
    bytes32 private constant SOURCE_HASH_V2 = keccak256("source-v2");
    bytes32 private constant PERMISSION_HASH_V1 = keccak256("permission-v1");
    bytes32 private constant PERMISSION_HASH_V2 = keccak256("permission-v2");
    bytes32 private constant CONTRIBUTION_HASH = keccak256("contribution-1");
    bytes32 private constant CONTRIBUTION_ID = keccak256("contribution-id-1");

    function setUp() public {
        provenance = new FanovaProvenance();
        vm.prank(CREATOR);
        provenance.registerStoryVersion(STORY_ID, 1, SOURCE_HASH_V1, 1, PERMISSION_HASH_V1);
    }

    function testFanSubmissionAndCreatorDecision() public {
        _submit(CONTRIBUTION_ID);

        vm.prank(CREATOR);
        provenance.decideContribution(CONTRIBUTION_ID, true, bytes32("APPROVED"));

        FanovaProvenance.Contribution memory contribution = provenance.getContribution(CONTRIBUTION_ID);
        require(contribution.exists, "contribution missing");
        require(contribution.decided, "decision missing");
        require(contribution.approved, "approval not stored");
        require(contribution.reviewer == CREATOR, "wrong reviewer");
        require(contribution.sourceVersion == 1, "wrong source version");
        require(contribution.permissionHash == PERMISSION_HASH_V1, "wrong permission hash");
        require(contribution.decidedAt > 0, "missing timestamp");
    }

    function testUnauthorizedDecisionRevertsWithoutMutation() public {
        _submit(CONTRIBUTION_ID);

        vm.prank(ATTACKER);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.decideContribution.selector,
                CONTRIBUTION_ID,
                true,
                bytes32("APPROVED")
            )
        );

        require(!success, "unauthorized decision unexpectedly succeeded");
        FanovaProvenance.Contribution memory contribution = provenance.getContribution(CONTRIBUTION_ID);
        require(!contribution.decided, "failed call mutated decision state");
        require(contribution.reviewer == address(0), "failed call set reviewer");
    }

    function testPermissionAcknowledgementIsRequired() public {
        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                CONTRIBUTION_ID,
                STORY_ID,
                uint64(1),
                uint64(1),
                PERMISSION_HASH_V1,
                CONTRIBUTION_HASH,
                false
            )
        );

        require(!success, "submission without acknowledgement succeeded");
        require(!provenance.getContribution(CONTRIBUTION_ID).exists, "failed submission mutated state");
    }

    function testPermissionHashMustMatchRegisteredVersion() public {
        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                CONTRIBUTION_ID,
                STORY_ID,
                uint64(1),
                uint64(1),
                PERMISSION_HASH_V2,
                CONTRIBUTION_HASH,
                true
            )
        );

        require(!success, "mismatched permission hash accepted");
        require(!provenance.getContribution(CONTRIBUTION_ID).exists, "failed submission mutated state");
    }

    function testStaleSourceVersionCannotBeSubmitted() public {
        _registerVersion2();

        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                CONTRIBUTION_ID,
                STORY_ID,
                uint64(1),
                uint64(1),
                PERMISSION_HASH_V1,
                CONTRIBUTION_HASH,
                true
            )
        );

        require(!success, "stale source version accepted");
        require(!provenance.getContribution(CONTRIBUTION_ID).exists, "failed submission mutated state");
    }

    function testPendingContributionCannotBeDecidedAfterVersionBump() public {
        _submit(CONTRIBUTION_ID);
        _registerVersion2();

        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.decideContribution.selector,
                CONTRIBUTION_ID,
                true,
                bytes32("APPROVED")
            )
        );

        require(!success, "stale pending contribution was decided");
        FanovaProvenance.Contribution memory contribution = provenance.getContribution(CONTRIBUTION_ID);
        require(!contribution.decided, "failed stale decision mutated state");
    }

    function testOnlyOneFinalDecisionIsAllowed() public {
        _submit(CONTRIBUTION_ID);

        vm.prank(CREATOR);
        provenance.decideContribution(CONTRIBUTION_ID, false, bytes32("REJECTED"));

        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.decideContribution.selector,
                CONTRIBUTION_ID,
                true,
                bytes32("APPROVED")
            )
        );

        require(!success, "second decision unexpectedly succeeded");
        FanovaProvenance.Contribution memory contribution = provenance.getContribution(CONTRIBUTION_ID);
        require(contribution.decided, "original decision lost");
        require(!contribution.approved, "original rejection was mutated");
    }

    function testDuplicateContributionIdIsRejected() public {
        _submit(CONTRIBUTION_ID);

        vm.prank(FAN);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerContribution.selector,
                CONTRIBUTION_ID,
                STORY_ID,
                uint64(1),
                uint64(1),
                PERMISSION_HASH_V1,
                keccak256("different-contribution"),
                true
            )
        );

        require(!success, "duplicate contribution id accepted");
        require(
            provenance.getContribution(CONTRIBUTION_ID).contributionHash == CONTRIBUTION_HASH,
            "failed duplicate overwrote original"
        );
    }

    function testOnlyCreatorCanRegisterNextStoryVersion() public {
        vm.prank(ATTACKER);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                STORY_ID,
                uint64(2),
                SOURCE_HASH_V2,
                uint64(1),
                PERMISSION_HASH_V1
            )
        );

        require(!success, "non-creator registered a version");
        require(provenance.getStory(STORY_ID).latestVersion == 1, "failed call changed latest version");
    }

    function testPermissionVersionMustIncreaseWhenPermissionTextChanges() public {
        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                STORY_ID,
                uint64(2),
                SOURCE_HASH_V2,
                uint64(1),
                PERMISSION_HASH_V2
            )
        );

        require(!success, "changed permissions reused old version number");
        require(provenance.getStory(STORY_ID).latestVersion == 1, "failed call changed latest version");

        vm.prank(CREATOR);
        provenance.registerStoryVersion(STORY_ID, 2, SOURCE_HASH_V2, 2, PERMISSION_HASH_V2);
        require(provenance.getStory(STORY_ID).latestVersion == 2, "valid version update failed");
    }

    function testSourceVersionsMustBeSequential() public {
        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                STORY_ID,
                uint64(3),
                SOURCE_HASH_V2,
                uint64(1),
                PERMISSION_HASH_V1
            )
        );

        require(!success, "non-sequential version accepted");
        require(provenance.getStory(STORY_ID).latestVersion == 1, "failed call changed latest version");
    }

    function testZeroHashesAreRejected() public {
        vm.prank(CREATOR);
        (bool success,) = address(provenance).call(
            abi.encodeWithSelector(
                provenance.registerStoryVersion.selector,
                keccak256("another-story"),
                uint64(1),
                bytes32(0),
                uint64(1),
                PERMISSION_HASH_V1
            )
        );

        require(!success, "zero source hash accepted");
        require(!provenance.getStory(keccak256("another-story")).exists, "failed registration mutated state");
    }

    function _submit(bytes32 contributionId) internal {
        vm.prank(FAN);
        provenance.registerContribution(
            contributionId,
            STORY_ID,
            1,
            1,
            PERMISSION_HASH_V1,
            CONTRIBUTION_HASH,
            true
        );
    }

    function _registerVersion2() internal {
        vm.prank(CREATOR);
        provenance.registerStoryVersion(STORY_ID, 2, SOURCE_HASH_V2, 1, PERMISSION_HASH_V1);
    }
}
