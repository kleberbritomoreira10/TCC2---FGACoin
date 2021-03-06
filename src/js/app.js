App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: function() {
    console.log("App initialized...")
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // Se uma instância web3 já for fornecida pelo Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Especifique a instância padrão se nenhuma instância da web3 for fornecida
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContracts();
  },

  initContracts: function() {
    $.getJSON("FGACoinSale.json", function(FGACoinSale) {
      App.contracts.FGACoinSale = TruffleContract(FGACoinSale);
      App.contracts.FGACoinSale.setProvider(App.web3Provider);
      App.contracts.FGACoinSale.deployed().then(function(FGACoinSale) {
        console.log("FGACOIN Sale Address:", FGACoinSale.address);
      });
    }).done(function() {
      $.getJSON("FGACoin.json", function(FGACoin) {
        App.contracts.FGACoin = TruffleContract(FGACoin);
        App.contracts.FGACoin.setProvider(App.web3Provider);
        App.contracts.FGACoin.deployed().then(function(FGACoin) {
          console.log("FGACoin Address:", FGACoin.address);
        });

        App.listenForEvents();
        return App.render();
      });
    })
  },

  // Ouvir eventos emitidos pelo contrato
  listenForEvents: function() {
    App.contracts.FGACoinSale.deployed().then(function(instance) {
      instance.Sell({}, {
        fromBlock: 0,
        toBlock: 'latest',
      }).watch(function(error, event) {
        console.log("event triggered", event);
        App.render();
      })
    })
  },

  render: function() {
    if (App.loading) {
      return;
    }
    App.loading = true;

    var loader  = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    // Carregar dados da conta
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#accountAddress').html("Sua Conta: " + account);
      }
    })

    // Contrato de venda de Tokens
    App.contracts.FGACoinSale.deployed().then(function(instance) {
      FGACoinSaleInstance = instance;
      return FGACoinSaleInstance.tokenPrice();
    }).then(function(tokenPrice) {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.fromWei(App.tokenPrice, "ether").toNumber());
      return FGACoinSaleInstance.tokensSold();
    }).then(function(tokensSold) {
      App.tokensSold = tokensSold.toNumber();
      $('.tokens-sold').html(App.tokensSold);
      $('.tokens-available').html(App.tokensAvailable);

      var progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
      $('#progress').css('width', progressPercent + '%');

      // Carregar token contrato
      App.contracts.FGACoin.deployed().then(function(instance) {
        FGACoinInstance = instance;
        return FGACoinInstance.balanceOf(App.account);
      }).then(function(balance) {
        $('.fgacoin-balance').html(balance.toNumber());
        App.loading = false;
        loader.hide();
        content.show();
      })
    });
  },

  buyTokens: function() {
    $('#content').hide();
    $('#loader').show();
    var numberOfTokens = $('#numberOfTokens').val();
    App.contracts.FGACoinSale.deployed().then(function(instance) {
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000 // Gas limite
      });
    }).then(function(result) {
      console.log("Tokens bought...")
      $('form').trigger('reset') // resetar número de tokens em formulário
      // Esperar pelo evento Sell
    });
  }
}

$(function() {
  $(window).load(function() {
    App.init();
  })
});
