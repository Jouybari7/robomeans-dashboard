const awsconfig = {
  Auth: {
    region: "ca-central-1",
    userPoolId: "ca-central-1_k5rYj45TL",
    userPoolWebClientId: "3avfshtm25k1dqmqt1r98v7dmj",
    identityPoolId: "ca-central-1:7c557726-d5c6-47c1-9019-a7b8fa2ab6fe",
    oauth: {
      domain: "ca-central-1k5ryj45tl.auth.ca-central-1.amazoncognito.com",
      scope: ["email", "openid"],
      redirectSignIn: "http://localhost:3000/",
      redirectSignOut: "http://localhost:3000/",
      responseType: "token"
    }
  }
};

export default awsconfig;
