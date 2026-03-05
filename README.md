
# Kiya

These are the files for an NLP university course project where we developed an AIML (Artificial Intelligence Markup Language) conversational agent. Its purpose is to serve as a PoC (Proof of Concept) for an AI assistant that helped the Spanish-speaking elderly navigate their questions when interacting with mobile devices.

We followed an adapted version of the [IThaKA pattern design](https://zenodo.org/records/18237644), leaving out the dual index structure of common and specific knowledge, as we weren't going to reuse the chatbot and it was a small PoC that wasn't going to have much personality (common knowledge).



## Authors

- Andrea Alonso
- Nuria García
- Clara García Novo
- Carmen Oliva
- Aurora Ramos Hernández
- Jorge Zamora Rey ([@reddrex](https://github.com/reddrex))


## FAQ

#### What do I need for it to work on my device?

Because of the diversity of skills in the team, we deployed the files in Pandorabots. However, you just need an AIML interpreter for our files to work with your project. You can easily use libraries that support AIML 2.0/2.1 that must support the sets, maps and such that Pandorabots uses; e.g. pyaiml21 in Python or Program AB in Java.

#### Where can I try it? Do I have to clone the repository and choose and interpreter?

Not really, it used to be that way, but I've recently tried to emulate an AIML interpreter in Javascript so you can interact with the chatbot here (those files are on the gh pages branch, chatbot files remain on the origin/main one).
You can try it on github pages, here: https://reddrex.github.io/kiya/. Do keep in mind that it is a rule-based chatbot with a very small corpora of predefined interactions.

#### Can I reuse your project?

Sure, just give us a heads up + mention our project! We would love to see it grow and turn into something.



## License

[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)

