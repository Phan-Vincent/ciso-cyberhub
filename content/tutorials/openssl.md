## Purpose and scope

OpenSSL exposes cryptographic primitives through command-line tools. This exercise uses hashing to demonstrate change detection. It deliberately avoids generating a production certificate authority or modifying your system’s trust store. Integrity comparison only helps when the reference digest has a trustworthy origin.

## Prerequisites and safe installation

Use the OpenSSL installation supplied by a trusted system package or the official project. Create two harmless text files that differ by one character. Confirm the actual executable version, since similarly named compatibility tools may have different features. Consult the [official project documentation](https://docs.openssl.org/master/man1/openssl-dgst/) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Record the tool version.
2. Compute a SHA-256 digest of each file.
3. Compare the full hexadecimal outputs.
4. Copy one file without changing it and compare again.
5. Explain why publishing a digest beside a file on the same compromised server does not authenticate the release.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
openssl version
openssl dgst -sha256 positive.txt
openssl dgst -sha256 negative.txt
```

## Verify the result

Identical byte sequences have the same digest. Even a newline difference changes the input, so text editors and line-ending conversion can explain unexpected differences. A digest cannot be decoded to reconstruct the original file.

## Troubleshooting and next challenge

If your results differ across systems, compare actual bytes and line endings first. For authentication, use a signature with a separately trusted key or another authenticated distribution channel. Do not invent cryptographic formats for real credentials.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/incident-response/).
