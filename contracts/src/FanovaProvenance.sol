// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title FANOVA Provenance
/// @notice Minimal onchain workflow proof for versioned stories and creator decisions.
/// @dev Records hashes and identifiers only. It does not prove legal IP ownership or licensing.
contract FanovaProvenance {
    error InvalidId();
    error InvalidHash();
    error InvalidVersion();
    error StoryNotFound();
    error StoryVersionNotFound();
    error UnauthorizedCreator();
    error InvalidSourceVersion();
    error PermissionVersionMustNotDecrease();
    error PermissionVersionMustIncrease();
    error PermissionNotAcknowledged();
    error ContributionAlreadyExists();
    error ContributionNotFound();
    error PermissionMismatch();
    error StaleSourceVersion();
    error AlreadyDecided();

    struct Story {
        address creator;
        uint64 latestVersion;
        bytes32 creatorSalt;
        bool exists;
    }

    struct StoryVersion {
        bytes32 sourceHash;
        bytes32 permissionHash;
        uint64 permissionVersion;
        bool exists;
    }

    struct Contribution {
        bytes32 storyId;
        bytes32 contributionHash;
        bytes32 permissionHash;
        address contributor;
        address reviewer;
        uint64 sourceVersion;
        uint64 permissionVersion;
        uint256 decidedAt;
        bool exists;
        bool decided;
        bool approved;
    }

    mapping(bytes32 storyId => Story) private _stories;
    mapping(bytes32 storyId => mapping(uint64 version => StoryVersion)) private _storyVersions;
    mapping(bytes32 contributionId => Contribution) private _contributions;

    event StoryVersionRegistered(
        bytes32 indexed storyId,
        uint64 indexed sourceVersion,
        address indexed creator,
        bytes32 sourceHash,
        uint64 permissionVersion,
        bytes32 permissionHash
    );

    event ContributionRegistered(
        bytes32 indexed contributionId,
        bytes32 indexed storyId,
        uint64 indexed sourceVersion,
        address contributor,
        bytes32 contributionHash,
        uint64 permissionVersion,
        bytes32 permissionHash,
        bool permissionAcknowledged
    );

    event ContributionDecided(
        bytes32 indexed contributionId,
        bytes32 indexed storyId,
        uint64 indexed sourceVersion,
        address reviewer,
        bool approved,
        bytes32 reasonCode,
        uint256 decidedAt
    );

    /// @notice Derive a stable story ID bound to the creator address and their chosen salt.
    function computeStoryId(address creator, bytes32 creatorSalt) public pure returns (bytes32) {
        return keccak256(abi.encode(creator, creatorSalt));
    }

    /// @notice Register a new immutable version of a story and its permission statement.
    /// @dev The first version must be 1; later versions must be sequential and creator-controlled.
    function registerStoryVersion(
        bytes32 storyId,
        bytes32 creatorSalt,
        uint64 sourceVersion,
        bytes32 sourceHash,
        uint64 permissionVersion,
        bytes32 permissionHash
    ) external {
        if (storyId == bytes32(0)) revert InvalidId();
        if (sourceHash == bytes32(0) || permissionHash == bytes32(0)) revert InvalidHash();
        if (sourceVersion == 0 || permissionVersion == 0) revert InvalidVersion();

        Story storage story = _stories[storyId];
        if (story.exists) {
            _validateExistingStoryVersion(
                story,
                storyId,
                creatorSalt,
                sourceVersion,
                permissionVersion,
                permissionHash
            );
        } else {
            if (storyId != computeStoryId(msg.sender, creatorSalt)) revert InvalidId();
            if (sourceVersion != 1) revert InvalidSourceVersion();
            story.creator = msg.sender;
            story.creatorSalt = creatorSalt;
            story.exists = true;
        }

        if (_storyVersions[storyId][sourceVersion].exists) revert InvalidSourceVersion();

        _storyVersions[storyId][sourceVersion] = StoryVersion({
            sourceHash: sourceHash,
            permissionHash: permissionHash,
            permissionVersion: permissionVersion,
            exists: true
        });
        story.latestVersion = sourceVersion;

        emit StoryVersionRegistered(
            storyId,
            sourceVersion,
            msg.sender,
            sourceHash,
            permissionVersion,
            permissionHash
        );
    }

    function _validateExistingStoryVersion(
        Story storage story,
        bytes32 storyId,
        bytes32 creatorSalt,
        uint64 sourceVersion,
        uint64 permissionVersion,
        bytes32 permissionHash
    ) internal view {
        if (story.creator != msg.sender) revert UnauthorizedCreator();
        if (story.creatorSalt != creatorSalt) revert InvalidId();
        if (story.latestVersion == type(uint64).max) revert InvalidVersion();
        if (sourceVersion != story.latestVersion + 1) revert InvalidSourceVersion();

        StoryVersion storage previous = _storyVersions[storyId][story.latestVersion];
        if (permissionVersion < previous.permissionVersion) {
            revert PermissionVersionMustNotDecrease();
        }
        if (permissionHash != previous.permissionHash && permissionVersion <= previous.permissionVersion) {
            revert PermissionVersionMustIncrease();
        }
    }

    /// @notice Register a contribution against the exact current story and permission version.
    /// @dev A successful transaction records the contributor's explicit permission acknowledgement.
    function registerContribution(
        bytes32 contributionId,
        bytes32 storyId,
        uint64 sourceVersion,
        uint64 permissionVersion,
        bytes32 permissionHash,
        bytes32 contributionHash,
        bool permissionAcknowledged
    ) external {
        if (contributionId == bytes32(0) || storyId == bytes32(0)) revert InvalidId();
        if (permissionHash == bytes32(0) || contributionHash == bytes32(0)) revert InvalidHash();
        if (!permissionAcknowledged) revert PermissionNotAcknowledged();
        if (_contributions[contributionId].exists) revert ContributionAlreadyExists();

        Story storage story = _stories[storyId];
        if (!story.exists) revert StoryNotFound();
        if (sourceVersion == 0 || permissionVersion == 0) revert InvalidVersion();
        if (sourceVersion != story.latestVersion) revert StaleSourceVersion();

        StoryVersion storage version = _storyVersions[storyId][sourceVersion];
        if (!version.exists) revert StoryVersionNotFound();
        if (permissionVersion != version.permissionVersion || permissionHash != version.permissionHash) {
            revert PermissionMismatch();
        }

        _contributions[contributionId] = Contribution({
            storyId: storyId,
            contributionHash: contributionHash,
            permissionHash: permissionHash,
            contributor: msg.sender,
            reviewer: address(0),
            sourceVersion: sourceVersion,
            permissionVersion: permissionVersion,
            decidedAt: 0,
            exists: true,
            decided: false,
            approved: false
        });

        emit ContributionRegistered(
            contributionId,
            storyId,
            sourceVersion,
            msg.sender,
            contributionHash,
            permissionVersion,
            permissionHash,
            true
        );
    }

    /// @notice Record one final approval or rejection from the registered story creator.
    /// @dev A newer story version invalidates pending decisions for older versions.
    function decideContribution(
        bytes32 contributionId,
        bool approved,
        bytes32 reasonCode
    ) external {
        Contribution storage contribution = _contributions[contributionId];
        if (!contribution.exists) revert ContributionNotFound();
        if (contribution.decided) revert AlreadyDecided();

        Story storage story = _stories[contribution.storyId];
        if (story.creator != msg.sender) revert UnauthorizedCreator();
        if (story.latestVersion != contribution.sourceVersion) revert StaleSourceVersion();

        StoryVersion storage version = _storyVersions[contribution.storyId][contribution.sourceVersion];
        if (
            !version.exists ||
            version.permissionVersion != contribution.permissionVersion ||
            version.permissionHash != contribution.permissionHash
        ) {
            revert PermissionMismatch();
        }

        contribution.reviewer = msg.sender;
        contribution.decidedAt = block.timestamp;
        contribution.decided = true;
        contribution.approved = approved;

        emit ContributionDecided(
            contributionId,
            contribution.storyId,
            contribution.sourceVersion,
            msg.sender,
            approved,
            reasonCode,
            contribution.decidedAt
        );
    }

    function getStory(bytes32 storyId) external view returns (Story memory) {
        return _stories[storyId];
    }

    function getStoryVersion(bytes32 storyId, uint64 sourceVersion) external view returns (StoryVersion memory) {
        return _storyVersions[storyId][sourceVersion];
    }

    function getContribution(bytes32 contributionId) external view returns (Contribution memory) {
        return _contributions[contributionId];
    }
}
