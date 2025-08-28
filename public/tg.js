if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;

    // В версии 6.0 цвета шапки не поддерживаются, поэтому закомментированы
    // tg.setHeaderColor("black");
    // tg.setBackgroundColor("black");

    tg.MainButton.text = "Поделиться";
    tg.MainButton.show();

    tg.MainButton.onClick(() => {
        tg.sendData("Игрок посмотрел факт: " + currentFact);
    });
}
